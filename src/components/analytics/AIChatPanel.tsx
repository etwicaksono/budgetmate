'use client';

/**
 * AIChatPanel
 *
 * Floating chat widget fixed at bottom-right of the viewport.
 * - FAB button (✨) opens/closes the chat panel
 * - Panel floats above the FAB, fixed positioned, does not affect page layout
 * - All session/context logic unchanged
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Spinner, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaMinimize, FaMaximize, FaClockRotateLeft, FaXmark } from 'react-icons/fa6';
import type { ContextSnapshot } from '@/lib/ai/types';
import { apiClient } from '@/services/api';
import { APP_CONFIG } from '@/utils/constants';
import { tokenCrypto } from '@/utils/crypto';
import { logError } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface Session {
  id: string;
  title: string | null;
  context_snapshot: ContextSnapshot;
  created_at: string;
  _count?: { messages: number };
}

interface AIChatPanelProps {
  context: ContextSnapshot;
  onRestoreContext: (snapshot: ContextSnapshot) => void;
}

interface ProviderOption {
  id: string;
  name: string;
  models: string[];
}

interface AIConfig {
  defaultProvider: string;
  providers: ProviderOption[];
}

// ─── Suggested questions ─────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Di mana potensi penghematan terbesar saya?',
  'Kategori mana yang paling boros bulan ini?',
  'Bagaimana tren pengeluaran saya dibanding periode sebelumnya?',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function contextKey(ctx: ContextSnapshot): string {
  return JSON.stringify({
    tab: ctx.activeTab,
    start: ctx.startDate,
    end: ctx.endDate,
    cats: [...(ctx.categoryIds ?? [])].sort(),
    accs: [...(ctx.accountIds ?? [])].sort(),
    curs: [...(ctx.currencies ?? [])].sort(),
  });
}

function contextLabel(ctx: ContextSnapshot): string {
  const parts = [ctx.periodLabel];
  if (ctx.categoryIds?.length) parts.push(`${ctx.categoryIds.length} kategori`);
  if (ctx.accountIds?.length) parts.push(`${ctx.accountIds.length} akun`);
  return parts.join(' · ');
}

// ─── Markdown rendering ──────────────────────────────────────────────────────

// Tables come from remark-gfm (not part of CommonMark). They are wrapped in a
// horizontally scrollable div so a wide table scrolls instead of stretching the
// chat bubble. Defined at module scope so the map isn't rebuilt on every render.
const MARKDOWN_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ node: _node, ...props }) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
  ul: ({ node: _node, ...props }) => <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }} {...props} />,
  ol: ({ node: _node, ...props }) => <ol style={{ margin: '0 0 8px 0', paddingLeft: '20px' }} {...props} />,
  li: ({ node: _node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
  h3: ({ node: _node, ...props }) => <h3 style={{ fontSize: '14px', margin: '12px 0 8px 0' }} {...props} />,
  h4: ({ node: _node, ...props }) => <h4 style={{ fontSize: '13px', margin: '10px 0 6px 0' }} {...props} />,

  table: ({ node: _node, ...props }) => (
    <div style={{ overflowX: 'auto', margin: '0 0 8px 0', maxWidth: '100%' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          fontSize: '12px',
          width: 'auto',
          minWidth: '100%',
          background: '#fff',
        }}
        {...props}
      />
    </div>
  ),
  thead: ({ node: _node, ...props }) => <thead style={{ background: '#e9ecef' }} {...props} />,
  th: ({ node: _node, ...props }) => (
    <th
      style={{
        border: '1px solid #dee2e6',
        padding: '5px 8px',
        textAlign: 'left',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td style={{ border: '1px solid #dee2e6', padding: '5px 8px', verticalAlign: 'top' }} {...props} />
  ),

  code: ({ node: _node, className, ...props }) => {
    // Fenced blocks arrive with a language- class and are wrapped in <pre>,
    // which owns the scrolling; inline code needs its own chip styling.
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return <code className={className} style={{ fontFamily: 'monospace', fontSize: '12px' }} {...props} />;
    }
    return (
      <code
        style={{
          background: '#e9ecef',
          borderRadius: '3px',
          padding: '1px 4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          wordBreak: 'break-word',
        }}
        {...props}
      />
    );
  },
  pre: ({ node: _node, ...props }) => (
    <pre
      style={{
        background: '#e9ecef',
        borderRadius: '6px',
        padding: '8px 10px',
        margin: '0 0 8px 0',
        overflowX: 'auto',
        maxWidth: '100%',
        fontSize: '12px',
      }}
      {...props}
    />
  ),

  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      style={{
        borderLeft: '3px solid #ced4da',
        margin: '0 0 8px 0',
        padding: '2px 0 2px 10px',
        color: '#495057',
      }}
      {...props}
    />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#2A5288', textDecoration: 'underline' }}
      {...props}
    />
  ),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIChatPanel({ context, onRestoreContext }: AIChatPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Sedang berpikir...');
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // AI provider/model settings
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore provider/model from localStorage
  useEffect(() => {
    const savedProv = localStorage.getItem('ai_provider');
    const savedModel = localStorage.getItem('ai_model');
    if (savedProv) setSelectedProvider(savedProv);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (selectedProvider) localStorage.setItem('ai_provider', selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem('ai_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (!(event.target as HTMLElement).closest('.session-menu-btn') && !(event.target as HTMLElement).closest('.session-menu-dropdown')) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sessionContextKeyRef = useRef<string | null>(null);
  const contextChanged =
    !!currentSession &&
    sessionContextKeyRef.current !== null &&
    sessionContextKeyRef.current !== contextKey(context);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      if (input === '') {
        textareaRef.current.style.height = 'auto';
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }
  }, [input]);

  // ── Data fetching ───────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/ai/config', { baseURL: '' });
      const json = res.data;
      const cfg: AIConfig = json.data ?? json;
      setAiConfig(cfg);
      // Init selections to defaults (only on first load)
      setSelectedProvider((prev) => prev || cfg.defaultProvider);
      setSelectedModel((prev) => {
        if (prev) return prev;
        const defaultProv = cfg.providers.find((p) => p.id === cfg.defaultProvider);
        return defaultProv?.models[0] ?? '';
      });
    } catch (err) {
      logError('Failed to fetch AI config:', err);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await apiClient.get('/api/ai/sessions', { baseURL: '' });
      const json = res.data;
      setSessions(json.data ?? json);
    } catch (err) {
      logError('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Update the `chat` query param so an expanded conversation survives refresh.
  const setChatParam = useCallback(
    (sessionId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sessionId) {
        params.set('chat', sessionId);
      } else {
        params.delete('chat');
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const loadSession = useCallback(async (session: Session) => {
    setCurrentSession(session);
    sessionContextKeyRef.current = contextKey(session.context_snapshot);
    setShowSessionList(false);
    try {
      const res = await apiClient.get(`/api/ai/sessions/${session.id}`, { baseURL: '' });
      const json = res.data;
      const loaded: Session = json.data ?? json;
      setCurrentSession(loaded);
      
      const loadedMessages = (loaded as Session & { messages?: Array<{ id?: string; role: string; content: string; created_at?: string }> }).messages ?? [];
      setMessages(
        loadedMessages.map((m) => ({
          ...(m.id !== undefined && { id: m.id }),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ...(m.created_at !== undefined && { created_at: m.created_at }),
        }))
      );
    } catch (err) {
      logError('Failed to load session:', err);
    }
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Percakapan',
      html: `<p>Apakah Anda yakin ingin menghapus riwayat obrolan ini?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });
    
    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/api/ai/sessions/${id}`, { baseURL: '' });
      if (currentSession?.id === id) {
        setCurrentSession(null);
        setMessages([]);
      }
      await loadSessions();
      setMenuOpenId(null);
    } catch (err) {
      logError('Failed to delete chat session:', err);
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete chat session.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  }, [currentSession, loadSessions]);

  const createSession = useCallback(async (ctx: ContextSnapshot) => {
    const res = await apiClient.post('/api/ai/sessions', { context_snapshot: ctx }, { baseURL: '' });
    const json = res.data;
    const session: Session = json.data ?? json;
    sessionContextKeyRef.current = contextKey(ctx);
    setCurrentSession(session);
    setMessages([]);
    setSessions((prev) => [session, ...prev]);
    return session;
  }, []);

  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    await Promise.all([loadSessions(), fetchConfig()]);
  }, [loadSessions, fetchConfig]);

  // Keep the `chat` query param in sync with the expanded conversation so a
  // browser refresh reopens the same chat. The param is only present while the
  // chat is expanded; collapsing or closing removes it.
  useEffect(() => {
    if (isOpen && isExpanded && currentSession) {
      setChatParam(currentSession.id);
    } else {
      setChatParam(null);
    }
  }, [isOpen, isExpanded, currentSession, setChatParam]);

  // Restore an expanded chat from the URL on first mount (e.g. after refresh).
  const didRestoreFromUrlRef = useRef(false);
  useEffect(() => {
    if (didRestoreFromUrlRef.current) return;
    const chatId = searchParams.get('chat');
    if (!chatId) return;
    didRestoreFromUrlRef.current = true;

    void (async () => {
      setIsOpen(true);
      setIsExpanded(true);
      await Promise.all([loadSessions(), fetchConfig()]);
      try {
        const res = await apiClient.get(`/api/ai/sessions/${chatId}`, { baseURL: '' });
        const json = res.data;
        const loaded: Session = json.data ?? json;
        await loadSession(loaded);
      } catch (err) {
        logError('Failed to restore chat session from URL:', err);
      }
    })();
  }, [searchParams, loadSessions, fetchConfig, loadSession]);

  const handleSend = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || isSending) return;
      setInput('');
      setIsSending(true);
      setLoadingStatus('Sedang berpikir...');
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      try {
        let session = currentSession;
        if (!session) session = await createSession(context);

        // Optimistically set a default title (first 100 chars of the question)
        // for brand-new sessions so the sidebar/header never shows an empty or
        // placeholder title while the AI-generated title is still pending.
        if (!session.title) {
          const defaultTitle = text.slice(0, 100).trim();
          const sessionId = session.id;
          session = { ...session, title: defaultTitle };
          setCurrentSession((prev) =>
            prev && prev.id === sessionId ? { ...prev, title: defaultTitle } : prev
          );
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId && !s.title ? { ...s, title: defaultTitle } : s))
          );
        }

        const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
        let token = '';
        if (encryptedToken) {
          token = (await tokenCrypto.decryptToken(encryptedToken)) || '';
        }

        const res = await fetch(`/api/ai/sessions/${session.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            content: text,
            ...(selectedProvider ? { provider: selectedProvider } : {}),
            ...(selectedModel ? { model: selectedModel } : {}),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || `HTTP Error ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('Streaming not supported by browser.');

        const decoder = new TextDecoder();
        let aiText = '';
        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'tool_status') {
                  setLoadingStatus(data.content);
                } else if (data.type === 'chunk') {
                  if (isFirstChunk) {
                    isFirstChunk = false;
                    setIsSending(false); // Hide spinner
                    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
                  }
                  aiText += data.content;
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg) lastMsg.content = aiText;
                    return newMsgs;
                  });
                } else if (data.type === 'error') {
                   throw new Error(data.content);
                }
              } catch (e: unknown) {
                if (e instanceof SyntaxError) {
                  // Ignore parse errors from partial JSON
                } else {
                  throw e; // Bubble up stream errors
                }
              }
            }
          }
        }
        
        await loadSessions();
      } catch (err: unknown) {
        setIsSending(false);
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        const errorMsg = apiErr?.response?.data?.message || apiErr?.message || 'Maaf, terjadi kesalahan. Silakan coba lagi.';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `**Error:** ${errorMsg}` },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, currentSession, context, createSession, loadSessions, selectedProvider, selectedModel]
  );

  const handleRestoreContext = useCallback(() => {
    if (currentSession) {
      onRestoreContext(currentSession.context_snapshot);
      sessionContextKeyRef.current = contextKey(currentSession.context_snapshot);
    }
  }, [currentSession, onRestoreContext]);

  const handleNewChat = useCallback(async () => {
    try {
      await createSession(context);
    } catch (error) {
      logError('Failed to create new chat session:', error);
      Swal.fire({
        icon: 'error',
        title: 'New Chat Failed',
        text: 'Failed to create a new chat session.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
    }
  }, [context, createSession]);

  const handleRenameSubmit = useCallback(
    async (sessionId: string) => {
      if (!renameValue.trim()) return;
      try {
        await apiClient.put(`/api/ai/sessions/${sessionId}`, { title: renameValue }, { baseURL: '' });
        // Optimistic update
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: renameValue } : s)));
        if (currentSession?.id === sessionId) {
          setCurrentSession({ ...currentSession, title: renameValue } as Session);
        }
        setRenamingId(null);
        setRenameValue('');
      } catch (error) {
        logError('Failed to rename chat session:', error);
        Swal.fire({
          icon: 'error',
          title: 'Rename Failed',
          text: 'Failed to rename chat session.',
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
        });
      }
    },
    [renameValue, currentSession]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating chat panel ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? 0 : '88px',
            right: isExpanded ? 0 : (isMobile ? '16px' : '24px'),
            width: isExpanded ? '100vw' : (isMobile ? 'calc(100vw - 32px)' : '360px'),
            maxWidth: isExpanded ? '100vw' : 'calc(100vw - 32px)',
            height: isExpanded ? '100vh' : 'auto',
            maxHeight: isExpanded ? '100vh' : 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: (isExpanded && !isMobile) ? 'row' : 'column',
            background: '#fff',
            borderRadius: isExpanded ? 0 : '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: isExpanded ? 'none' : '1px solid rgba(0,0,0,0.08)',
            zIndex: 1050,
            overflow: 'hidden',
            transition: 'width 0.25s ease, height 0.25s ease, max-height 0.25s ease, bottom 0.25s ease, right 0.25s ease, border-radius 0.25s ease',
          }}
        >
          {/* ── Sidebar (Only visible when expanded and not on mobile) ── */}
          {isExpanded && !isMobile && (
            <div style={{ width: '260px', background: '#f9f9f9', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '14px', borderBottom: '1px solid #e9ecef' }}>
                <button
                  onClick={() => void handleNewChat()}
                  style={{ width: '100%', background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '8px', color: '#212529', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  <span style={{ fontSize: '16px' }}>+</span> Chat baru
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: isExpanded ? '12px 24px 6px' : '12px 14px 6px', fontSize: '11px', fontWeight: 600, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Riwayat Percakapan
                </div>
                {isLoadingSessions ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}><Spinner size="sm" /></div>
                ) : sessions.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '12px', padding: '20px', margin: 0 }}>Belum ada percakapan</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: isExpanded ? '12px 24px' : '10px 14px',
                        background: currentSession?.id === s.id ? '#e8f0fe' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (currentSession?.id !== s.id) e.currentTarget.style.background = '#f1f3f5'; }}
                      onMouseLeave={(e) => { if (currentSession?.id !== s.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {renamingId === s.id ? (
                        <Form
                          className="d-flex gap-1 w-100"
                          onSubmit={(e) => { e.preventDefault(); void handleRenameSubmit(s.id); }}
                        >
                          <Form.Control
                            size="sm"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            onBlur={() => { setRenamingId(null); setRenameValue(''); }}
                            style={{ fontSize: '13px' }}
                          />
                          <button type="submit" style={{ background: '#1E3A5F', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}>✓</button>
                        </Form>
                      ) : (
                        <>
                          <span
                            style={{ flexGrow: 1, minWidth: 0, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: currentSession?.id === s.id ? '#1E3A5F' : '#495057', fontWeight: currentSession?.id === s.id ? 500 : 400 }}
                            onClick={() => void loadSession(s)}
                          >
                            {s.title || 'Percakapan baru'}
                          </span>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                              className="session-menu-btn"
                              title="Opsi"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '14px', color: '#adb5bd', flexShrink: 0, opacity: currentSession?.id === s.id || menuOpenId === s.id ? 1 : 0.4 }}
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === s.id ? null : s.id); }}
                            >
                              ⋮
                            </button>
                            {menuOpenId === s.id && (
                              <div
                                className="session-menu-dropdown"
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  background: '#fff',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  zIndex: 10,
                                  minWidth: '100px',
                                  overflow: 'hidden'
                                }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setRenamingId(s.id); setRenameValue(s.title ?? ''); }}
                                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #e9ecef', fontSize: '12px', cursor: 'pointer', color: '#495057' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteSession(s.id); }}
                                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', color: '#dc3545' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Main Chat Column ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #1E3A5F 0%, #2A5288 100%)',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '16px' }}>✨</span>
              <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSession?.title || 'AI Assistant'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                title={isExpanded ? 'Perkecil' : 'Perlebar'}
                onClick={() => setIsExpanded((v) => !v)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 7px', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                {isExpanded ? <FaMinimize /> : <FaMaximize />}
              </button>
              {(!isExpanded || isMobile) && (
                <button
                  title="Riwayat percakapan"
                  onClick={() => { setShowSessionList((v) => !v); if (!showSessionList) void loadSessions(); }}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 7px', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                >
                  <FaClockRotateLeft />
                </button>
              )}
              <button
                title="Tutup"
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                <FaXmark />
              </button>
            </div>
          </div>

          {/* Context changed banner */}
          {contextChanged && (
            <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: '#664d03' }}>⚠️ Filter berubah</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleRestoreContext}
                  style={{ background: 'none', border: 'none', color: '#856404', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0 }}
                >
                  ↩ Pulihkan
                </button>
                <button
                  onClick={() => void handleNewChat()}
                  style={{ background: 'none', border: 'none', color: '#6c757d', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0 }}
                >
                  + Chat baru
                </button>
              </div>
            </div>
          )}

          {/* Session list (Only shown in floating mode or on mobile) */}
          {(!isExpanded || isMobile) && showSessionList && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#fafafa', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e9ecef' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d' }}>Riwayat Percakapan</span>
                <button
                  onClick={() => void handleNewChat()}
                  style={{ background: 'none', border: '1px solid #1E3A5F', borderRadius: '10px', color: '#1E3A5F', cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}
                >
                  + Chat baru
                </button>
              </div>
              {isLoadingSessions ? (
                <div style={{ textAlign: 'center', padding: '12px' }}><Spinner size="sm" /></div>
              ) : sessions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6c757d', fontSize: '12px', padding: '12px', margin: 0 }}>Belum ada percakapan</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '7px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      background: currentSession?.id === s.id ? '#e8f0fe' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {renamingId === s.id ? (
                      <Form
                        className="d-flex gap-1 w-100"
                        onSubmit={(e) => { e.preventDefault(); void handleRenameSubmit(s.id); }}
                      >
                        <Form.Control
                          size="sm"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onBlur={() => { setRenamingId(null); setRenameValue(''); }}
                          style={{ fontSize: '12px' }}
                        />
                        <button type="submit" style={{ background: '#1E3A5F', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}>✓</button>
                      </Form>
                    ) : (
                      <>
                        <span
                          style={{ flexGrow: 1, minWidth: 0, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          onClick={() => void loadSession(s)}
                        >
                          {s.title || 'Percakapan baru'}
                        </span>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <button
                            className="session-menu-btn"
                            title="Opsi"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '14px', color: '#adb5bd', flexShrink: 0 }}
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === s.id ? null : s.id); }}
                          >
                            ⋮
                          </button>
                          {menuOpenId === s.id && (
                            <div
                              className="session-menu-dropdown"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: '100px',
                                overflow: 'hidden'
                              }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setRenamingId(s.id); setRenameValue(s.title ?? ''); }}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #e9ecef', fontSize: '11px', cursor: 'pointer', color: '#495057' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleDeleteSession(s.id); }}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#dc3545' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Context label */}
          <div style={{ padding: '5px 12px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: '#6c757d' }}>📌 {contextLabel(context)}</span>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minHeight: 0 }}>
            {messages.length === 0 && !isSending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ color: '#6c757d', fontSize: '12px', margin: '0 0 4px' }}>Tanyakan apa saja tentang data ini:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => void handleSend(q)}
                    style={{
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '12px',
                      color: '#495057',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '7px 12px',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#e9ecef'; }}
                    onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#f8f9fa'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', marginBottom: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '82%',
                    // Flex items default to min-width:auto, which lets a wide
                    // table push the bubble past maxWidth instead of scrolling.
                    minWidth: 0,
                    padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #1E3A5F, #2A5288)'
                      : '#f1f3f5',
                    color: msg.role === 'user' ? '#fff' : '#212529',
                    fontSize: '13px',
                    lineHeight: '1.55',
                    whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal',
                    wordBreak: 'break-word',
                  }}
                  className={msg.role === 'user' ? 'ai-chat-user-msg' : 'ai-chat-assistant-msg'}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={MARKDOWN_COMPONENTS}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div style={{ display: 'flex', marginBottom: '10px' }}>
                <div style={{ padding: '8px 14px', borderRadius: '16px 16px 16px 4px', background: '#f1f3f5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Spinner size="sm" style={{ width: '14px', height: '14px' }} />
                  <span style={{ color: '#6c757d' }}>{loadingStatus}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: '10px 12px 6px', borderTop: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', flexShrink: 0 }}>
            
            {/* Input field + Send button */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <Form.Control
                as="textarea"
                ref={textareaRef as React.Ref<HTMLTextAreaElement>}
                rows={1}
                placeholder="Ketik pertanyaan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(input);
                  }
                }}
                disabled={isSending}
                style={{ resize: 'none', fontSize: '13px', borderRadius: '12px', border: '1px solid #dee2e6', overflowY: 'auto' }}
              />
              <button
                onClick={() => void handleSend(input)}
                disabled={isSending || !input.trim()}
                style={{
                  background: 'linear-gradient(135deg, #1E3A5F, #2A5288)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: isSending || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSending || !input.trim() ? 0.6 : 1,
                  fontSize: '16px',
                  height: '38px',
                  minWidth: '44px',
                  flexShrink: 0,
                }}
              >
                {isSending ? <Spinner size="sm" style={{ width: '14px', height: '14px' }} /> : '→'}
              </button>
            </div>

            {/* AI Provider & Model Selectors */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#adb5bd', fontWeight: 600 }}>AI:</span>
              
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedProvider(pId);
                    const p = aiConfig?.providers.find((prov) => prov.id === pId);
                    if (p) setSelectedModel(p.models[0] ?? '');
                  }}
                  style={{
                    padding: '2px 18px 2px 8px',
                    borderRadius: '6px',
                    border: '1px solid transparent',
                    fontSize: '11px',
                    background: '#f1f3f5',
                    color: '#495057',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border 0.2s, background 0.2s',
                    appearance: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #dee2e6'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = '#f1f3f5'; }}
                >
                  {(aiConfig?.providers ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#adb5bd' }}>▼</div>
              </div>

              <div ref={dropdownRef} style={{ position: 'relative', flexGrow: 1, maxWidth: '180px' }}>
                <input
                  type="text"
                  value={showModelDropdown ? modelSearch : selectedModel}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    setShowModelDropdown(true);
                  }}
                  onClick={() => {
                    setModelSearch('');
                    setShowModelDropdown(true);
                  }}
                  placeholder="Cari model..."
                  style={{
                    width: '100%',
                    padding: '2px 18px 2px 8px',
                    borderRadius: '6px',
                    border: '1px solid transparent',
                    fontSize: '11px',
                    background: '#f1f3f5',
                    color: '#495057',
                    outline: 'none',
                    cursor: 'text',
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1px solid #dee2e6'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = '#f1f3f5'; }}
                />
                <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '9px', color: '#adb5bd' }}>▼</div>

                {showModelDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      minWidth: '200px',
                      marginBottom: '4px',
                      background: '#fff',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 10,
                    }}
                  >
                    {(aiConfig?.providers.find((p) => p.id === selectedProvider)?.models ?? [])
                      .filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase()))
                      .map((m) => (
                        <div
                          key={m}
                          onClick={() => {
                            setSelectedModel(m);
                            setShowModelDropdown(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            background: m === selectedModel ? '#e8f0fe' : 'transparent',
                            color: m === selectedModel ? '#1E3A5F' : '#212529',
                            fontWeight: m === selectedModel ? 600 : 400,
                          }}
                          onMouseEnter={(e) => {
                            if (m !== selectedModel) e.currentTarget.style.background = '#f8f9fa';
                          }}
                          onMouseLeave={(e) => {
                            if (m !== selectedModel) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {m}
                        </div>
                      ))}
                    {(aiConfig?.providers.find((p) => p.id === selectedProvider)?.models ?? []).filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '6px 10px', fontSize: '11px', color: '#6c757d', textAlign: 'center' }}>
                        Model tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
          {/* ── End Main Chat Column ── */}
        </div>
      )}

      {/* ── Floating Action Button ── */}
      {!isOpen && (
        <button
          onClick={() => void handleOpen()}
          title="Tanya AI Assistant"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E3A5F 0%, #2A5288 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(30, 58, 95, 0.4)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1051,
            transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          ✨
        </button>
      )}
    </>
  );
}
