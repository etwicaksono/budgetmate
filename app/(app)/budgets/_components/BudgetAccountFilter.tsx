'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Badge, Form, Button, Spinner } from 'react-bootstrap';
import { FaWallet, FaTimes, FaBookmark, FaTrash, FaCheck, FaPlus } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import type { Account } from '@/services/accountService';
import type { useSavedFilters } from '@/hooks/useSavedFilters';

// ─── Types ──────────────────────────────────────────────────────────────────

type SavedFiltersData = ReturnType<typeof useSavedFilters>;

interface BudgetAccountFilterProps {
  accounts: Account[];
  selectedAccounts: string[]; // account names
  onChangeAccounts: (names: string[]) => void;
  savedFiltersData: SavedFiltersData;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getIconComponent(iconKey: string): IconType {
  const ic = (FaIcons as Record<string, IconType>)[iconKey];
  return ic || FaWallet;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BudgetAccountFilter({
  accounts,
  selectedAccounts,
  onChangeAccounts,
  savedFiltersData,
  className = '',
}: BudgetAccountFilterProps) {
  const {
    savedFilters,
    loading: savedLoading,
    activeFilterId,
    saveCurrentFilter,
    loadFilter,
    deleteFilter,
    clearActiveFilter,
  } = savedFiltersData;

  // ── Popover state ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'accounts' | 'presets'>('accounts');
  const [saveInput, setSaveInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Account toggle ─────────────────────────────────────────────────────────
  const toggleAccount = useCallback(
    (name: string) => {
      onChangeAccounts(
        selectedAccounts.includes(name)
          ? selectedAccounts.filter((n) => n !== name)
          : [...selectedAccounts, name]
      );
      clearActiveFilter();
    },
    [selectedAccounts, onChangeAccounts, clearActiveFilter]
  );

  const clearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChangeAccounts([]);
      clearActiveFilter();
    },
    [onChangeAccounts, clearActiveFilter]
  );

  // ── Saved presets ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmed = saveInput.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveCurrentFilter(trimmed);
    setSaving(false);
    if (result.success) {
      setSaveInput('');
    } else if ('duplicateName' in result && result.duplicateName) {
      setSaveError('A preset with this name already exists.');
    } else {
      setSaveError('Failed to save. Please try again.');
    }
  }, [saveInput, saveCurrentFilter]);

  const handleLoad = useCallback(
    (filter: SavedFiltersData['savedFilters'][number]) => {
      loadFilter(filter);
      setOpen(false);
    },
    [loadFilter]
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeletingId(id);
      await deleteFilter(id);
      setDeletingId(null);
    },
    [deleteFilter]
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const isActive = selectedAccounts.length > 0;
  const activePreset = savedFilters.find((f) => f.id === activeFilterId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={`position-relative ${className}`} style={{ userSelect: 'none' }}>
      {/* ── Pill trigger button ── */}
      <button
        id="budget-account-filter-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-sm d-flex align-items-center gap-2 w-100"
        style={{
          border: `1.5px solid ${isActive ? 'var(--bs-primary)' : 'var(--bs-border-color)'}`,
          borderRadius: '8px',
          background: isActive ? 'color-mix(in srgb, var(--bs-primary) 8%, white)' : 'white',
          color: isActive ? 'var(--bs-primary)' : 'var(--bs-secondary)',
          padding: '0.4rem 0.75rem',
          fontWeight: 500,
          fontSize: '14px',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          minHeight: '38px',
        }}
        aria-label="Account filter"
        aria-expanded={open}
      >
        <FaWallet size={14} />
        <span className="flex-grow-1 text-start">
          {isActive
            ? selectedAccounts.length === 1
              ? selectedAccounts[0]
              : `${selectedAccounts.length} Accounts`
            : 'All Accounts'}
        </span>
        {isActive ? (
          <span
            className="badge rounded-pill"
            style={{
              backgroundColor: 'var(--bs-primary)',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 6px',
            }}
          >
            {selectedAccounts.length}
          </span>
        ) : null}
        {activePreset && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--bs-primary)',
              opacity: 0.75,
              maxWidth: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={activePreset.name}
          >
            {activePreset.name}
          </span>
        )}
        {isActive && (
          <span
            role="button"
            tabIndex={0}
            onClick={clearAll}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') clearAll(e as unknown as React.MouseEvent); }}
            aria-label="Clear account filter"
            className="d-flex align-items-center"
            style={{ color: 'var(--bs-primary)', cursor: 'pointer', lineHeight: 1 }}
          >
            <FaTimes size={11} />
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="position-absolute bg-white shadow rounded-3 border overflow-hidden"
          style={{
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '280px',
            maxWidth: '340px',
            zIndex: 1050,
            animation: 'fadeInDown 0.15s ease',
          }}
        >
          {/* Tabs */}
          <div
            className="d-flex border-bottom"
            style={{ background: 'var(--bs-gray-100)' }}
          >
            {(['accounts', 'presets'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="btn btn-sm flex-fill"
                style={{
                  borderRadius: 0,
                  fontWeight: tab === t ? 600 : 400,
                  borderBottom: tab === t ? '2px solid var(--bs-primary)' : '2px solid transparent',
                  color: tab === t ? 'var(--bs-primary)' : 'var(--bs-secondary)',
                  fontSize: '13px',
                  padding: '0.45rem',
                  background: 'none',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'accounts' ? (
                  <span className="d-flex align-items-center justify-content-center gap-1">
                    <FaWallet size={12} /> Accounts
                  </span>
                ) : (
                  <span className="d-flex align-items-center justify-content-center gap-1">
                    <FaBookmark size={12} /> Presets
                    {savedFilters.length > 0 && (
                      <Badge
                        pill
                        bg="primary"
                        style={{ fontSize: '9px', padding: '2px 5px', marginLeft: '2px' }}
                      >
                        {savedFilters.length}
                      </Badge>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Accounts tab ── */}
          {tab === 'accounts' && (
            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {accounts.length === 0 ? (
                <div className="py-4 text-center text-muted" style={{ fontSize: '13px' }}>
                  No accounts available
                </div>
              ) : (
                <div className="p-2">
                  {/* Select All / Clear All row */}
                  <div className="d-flex justify-content-between px-1 mb-1">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      style={{ fontSize: '12px', color: 'var(--bs-primary)' }}
                      onClick={() => { onChangeAccounts(accounts.map((a) => a.name)); clearActiveFilter(); }}
                    >
                      Select All
                    </button>
                    {selectedAccounts.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ fontSize: '12px', color: 'var(--bs-secondary)' }}
                        onClick={() => { onChangeAccounts([]); clearActiveFilter(); }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {accounts.map((account) => {
                    const checked = selectedAccounts.includes(account.name);
                    const IconComp = getIconComponent(account.icon || 'FaWallet');
                    return (
                      <div
                        key={account.id}
                        className="d-flex align-items-center gap-2 rounded-2 px-2 py-2 mb-1"
                        style={{
                          cursor: 'pointer',
                          background: checked
                            ? 'color-mix(in srgb, var(--bs-primary) 10%, white)'
                            : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onClick={() => toggleAccount(account.name)}
                      >
                        {/* Color dot + icon */}
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            backgroundColor: account.color || '#6c757d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={13} color="#fff" />
                        </div>

                        <span
                          className="flex-grow-1 text-truncate"
                          style={{ fontSize: '13px', fontWeight: checked ? 600 : 400 }}
                        >
                          {account.name}
                        </span>

                        {/* Checkbox */}
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${checked ? 'var(--bs-primary)' : 'var(--bs-border-color)'}`,
                            backgroundColor: checked ? 'var(--bs-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                          }}
                        >
                          {checked && <FaCheck size={9} color="#fff" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Presets tab ── */}
          {tab === 'presets' && (
            <div>
              {/* Save current as preset */}
              <div className="p-2 border-bottom">
                <div className="text-muted fw-semibold mb-2" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Save current selection
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Preset name…"
                    value={saveInput}
                    onChange={(e) => { setSaveInput(e.target.value); setSaveError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    style={{ fontSize: '13px', borderRadius: '7px' }}
                    disabled={saving}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSave}
                    disabled={!saveInput.trim() || saving || selectedAccounts.length === 0}
                    style={{ borderRadius: '7px', padding: '0 10px', flexShrink: 0 }}
                    title={selectedAccounts.length === 0 ? 'Select at least one account first' : 'Save preset'}
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : <FaPlus size={12} />}
                  </Button>
                </div>
                {saveError && (
                  <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{saveError}</div>
                )}
                {selectedAccounts.length === 0 && (
                  <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                    Select accounts to save as a preset.
                  </div>
                )}
              </div>

              {/* Saved presets list */}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {savedLoading ? (
                  <div className="py-3 text-center">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : savedFilters.length === 0 ? (
                  <div className="py-3 text-center text-muted" style={{ fontSize: '13px' }}>
                    No presets saved yet
                  </div>
                ) : (
                  <div className="p-2">
                    {savedFilters.map((filter) => {
                      const isActive_ = filter.id === activeFilterId;
                      return (
                        <div
                          key={filter.id}
                          className="d-flex align-items-center gap-2 rounded-2 px-2 py-2 mb-1"
                          style={{
                            cursor: 'pointer',
                            background: isActive_
                              ? 'color-mix(in srgb, var(--bs-primary) 10%, white)'
                              : 'transparent',
                            border: isActive_ ? '1px solid color-mix(in srgb, var(--bs-primary) 25%, white)' : '1px solid transparent',
                            transition: 'background 0.15s',
                          }}
                          onClick={() => handleLoad(filter)}
                        >
                          <FaBookmark
                            size={11}
                            color={isActive_ ? 'var(--bs-primary)' : 'var(--bs-secondary)'}
                            style={{ opacity: isActive_ ? 1 : 0.5, flexShrink: 0 }}
                          />
                          <span
                            className="flex-grow-1 text-truncate"
                            style={{
                              fontSize: '13px',
                              fontWeight: isActive_ ? 600 : 400,
                              color: isActive_ ? 'var(--bs-primary)' : 'inherit',
                            }}
                            title={filter.name}
                          >
                            {filter.name}
                          </span>
                          {/* account count badge */}
                          {filter.filters.selectedAccountIds && filter.filters.selectedAccountIds.length > 0 && (
                            <span
                              className="badge rounded-pill"
                              style={{
                                backgroundColor: isActive_ ? 'var(--bs-primary)' : 'var(--bs-gray-200)',
                                color: isActive_ ? '#fff' : 'var(--bs-secondary)',
                                fontSize: '10px',
                                padding: '2px 6px',
                                flexShrink: 0,
                              }}
                            >
                              {filter.filters.selectedAccountIds.length}
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm p-0 border-0 d-flex align-items-center"
                            style={{ background: 'none', color: 'var(--bs-danger)', opacity: 0.55, flexShrink: 0 }}
                            onClick={(e) => handleDelete(filter.id, e)}
                            disabled={deletingId === filter.id}
                            aria-label={`Delete preset ${filter.name}`}
                          >
                            {deletingId === filter.id
                              ? <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />
                              : <FaTrash size={11} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
