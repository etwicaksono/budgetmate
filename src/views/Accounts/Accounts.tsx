import React, { useMemo, useRef, useState, useEffect, ChangeEvent, FormEvent, DragEvent } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import {
  FaBars,
  FaMobileAlt,
  FaMoneyBillWave,
  FaPiggyBank,
  FaPlus,
  FaShoppingCart,
  FaStore,
  FaUniversity,
  FaWallet,
  FaInfoCircle,
} from 'react-icons/fa';

import { formatNumberDisplayFromValue, coerceAndFormatNumber } from '../../utils/numericInput';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { SingleCategoryDropdown } from '../../features/transactions/SingleCategoryDropdown';
import AddAccountModal from '../../components/AddAccountModal';

interface Account {
  id: string;
  order: number;
  name: string;
  type: string;
  balance: number;
  icon: React.ComponentType<{ size?: number }>;
  accentColor: string;
  backgroundColor: string;
  isArchived?: boolean;
  excludeFromStatistics?: boolean;
  currency?: string;
  isActive?: boolean;
  usability?: 'USABLE' | 'PROTECTED';
}

interface AccountType {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NewAccountForm {
  name: string;
  color: string;
  accountType: string;
  initialAmount: string;
  currency: string;
  excludeFromStatistics: boolean;
  iconKey: string;
  isActive: boolean;
  usability: 'USABLE' | 'PROTECTED';
}

interface Summary {
  totalVisibleBalance: number;
  activeCount: number;
  archivedCount: number;
}

// Constants with proper typing
const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'cash-eko',
    order: 1,
    name: 'Cash Eko',
    type: 'Cash',
    balance: 2816756,
    icon: FaMoneyBillWave as React.ComponentType<{ size?: number }>,
    accentColor: '#047857',
    backgroundColor: '#ecfdf5',
  },
  {
    id: 'cimb-syariah',
    order: 2,
    name: 'CIMB Syariah',
    type: 'Checking account',
    balance: 2813245.42,
    icon: FaUniversity as React.ComponentType<{ size?: number }>,
    accentColor: '#b91c1c',
    backgroundColor: '#fee2e2',
  },
  {
    id: 'saldo-pulsa',
    order: 3,
    name: 'Saldo Pulsa',
    type: 'General',
    balance: 80947,
    icon: FaMobileAlt as React.ComponentType<{ size?: number }>,
    accentColor: '#0284c7',
    backgroundColor: '#e0f2fe',
  },
  {
    id: 'ovo-eko',
    order: 4,
    name: 'OVO Eko',
    type: 'General',
    balance: 0,
    icon: FaWallet as React.ComponentType<{ size?: number }>,
    accentColor: '#7c3aed',
    backgroundColor: '#ede9fe',
  },
  {
    id: 'shopee-pay',
    order: 5,
    name: 'Shopee Pay Eko',
    type: 'General',
    balance: 0,
    icon: FaStore as React.ComponentType<{ size?: number }>,
    accentColor: '#ea580c',
    backgroundColor: '#ffedd5',
  },
  {
    id: 'saldo-tokped',
    order: 6,
    name: 'Saldo Tokped',
    type: 'General',
    balance: 0,
    icon: FaShoppingCart as React.ComponentType<{ size?: number }>,
    accentColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  {
    id: 'gopay',
    order: 7,
    name: 'Gopay',
    type: 'General',
    balance: 0,
    icon: FaWallet as React.ComponentType<{ size?: number }>,
    accentColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  {
    id: 'dana',
    order: 8,
    name: 'DANA',
    type: 'General',
    balance: 127741,
    icon: FaPiggyBank as React.ComponentType<{ size?: number }>,
    accentColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  {
    id: 'bca',
    order: 9,
    name: 'BCA',
    type: 'Checking account',
    balance: 0,
    icon: FaUniversity as React.ComponentType<{ size?: number }>,
    accentColor: '#1d4ed8',
    backgroundColor: '#dbeafe',
  },
  {
    id: 'cash-dewi',
    order: 10,
    name: 'Cash Dewi',
    type: 'Cash',
    balance: -7800,
    icon: FaMoneyBillWave as React.ComponentType<{ size?: number }>,
    accentColor: '#be123c',
    backgroundColor: '#fee2e2',
  },
  {
    id: 'archived-savings',
    order: 11,
    name: 'Savings Jar (Archived)',
    type: 'General',
    balance: 450000,
    icon: FaPiggyBank as React.ComponentType<{ size?: number }>,
    accentColor: '#7c3aed',
    backgroundColor: '#ede9fe',
    isArchived: true,
  },
];

const ACCOUNT_TYPES: AccountType[] = [
  { value: 'General', label: 'General', icon: FaWallet as React.ComponentType<{ size?: number }> },
  { value: 'Cash', label: 'Cash', icon: FaMoneyBillWave as React.ComponentType<{ size?: number }> },
  { value: 'Checking account', label: 'Checking account', icon: FaUniversity as React.ComponentType<{ size?: number }> },
];

const DEFAULT_ACCOUNT_ICON_KEY = 'FaWallet';
const ICON_EXCLUSIONS = new Set<string>(['IconContext']);
type UsabilityOption = 'USABLE' | 'PROTECTED';
const USABILITY_OPTIONS: readonly UsabilityOption[] = ['USABLE', 'PROTECTED'] as const;

const resolveIconComponent = (
  iconName: string | null | undefined
): React.ComponentType<{ size?: number }> | undefined => {
  if (!iconName) return undefined;
  const iconsLibrary = FaIcons as unknown as Record<string, IconType>;
  const IconComp = iconsLibrary[iconName];
  if (!IconComp) return undefined;
  return IconComp as unknown as React.ComponentType<{ size?: number }>;
};


// Icon wrapper to handle icon type issues
const IconWrapper: React.FC<{ 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any; 
  size?: number; 
  className?: string; 
}> = ({ icon: Icon, size, className }) => <Icon size={size} className={className} />;

// Utility functions with type annotations
const createEmptyAccountForm = (): NewAccountForm => ({
  name: '',
  color: '#ce9600',
  accountType: 'General',
  initialAmount: '',
  currency: 'IDR',
  excludeFromStatistics: false,
  iconKey: DEFAULT_ACCOUNT_ICON_KEY,
  isActive: true,
  usability: 'USABLE',
});

const reorderAccounts = (
  items: Account[], 
  sourceId: string, 
  targetId: string, 
  placeAfter: boolean
): Account[] => {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sourceIndex = sorted.findIndex((account) => account.id === sourceId);
  const targetIndex = sorted.findIndex((account) => account.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return items;
  }

  const [sourceAccount] = sorted.splice(sourceIndex, 1);

  let adjustedTargetIndex = targetIndex;
  if (sourceIndex < targetIndex) {
    adjustedTargetIndex -= 1;
  }

  let insertIndex = placeAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  insertIndex = Math.max(0, Math.min(insertIndex, sorted.length));

  sorted.splice(insertIndex, 0, sourceAccount);

  sorted.forEach((account, index) => {
    account.order = index + 1;
  });

  return [...sorted];
};

const lightenColor = (hex: string, ratio = 0.85): string => {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    return '#f8f9fa';
  }

  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const apply = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(apply(r))}${toHex(apply(g))}${toHex(apply(b))}`;
};

const generateAccountId = (name: string): string => {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fallback = base || 'account';
  return `${fallback}-${Date.now().toString(36)}`;
};

const Accounts: React.FC = () => {
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>(() =>
    INITIAL_ACCOUNTS.map((account) => ({ ...account })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newAccountForm, setNewAccountForm] = useState<NewAccountForm>(() => createEmptyAccountForm());
  const [colorHexInput, setColorHexInput] = useState<string>(() => createEmptyAccountForm().color);
  
  const colorPickerInputRef = useRef<HTMLInputElement>(null);
  const dragPreviewElementRef = useRef<HTMLDivElement | null>(null);

  const openColorPicker = (event?: React.MouseEvent): void => {
    const picker = colorPickerInputRef.current;
    if (!picker) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    picker.click();
  };

  const filteredAccounts = useMemo((): Account[] => {
    const relevantAccounts = showArchived ? accounts : accounts.filter((account) => !account.isArchived);
    return [...relevantAccounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [accounts, showArchived]);

  const summary = useMemo((): Summary => {
    const activeAccounts = accounts.filter((account) => !account.isArchived);
    const archivedAccounts = accounts.filter((account) => account.isArchived);
    const visibleAccounts = showArchived ? accounts : activeAccounts;

    return {
      totalVisibleBalance: visibleAccounts.reduce((total, account) => total + account.balance, 0),
      activeCount: activeAccounts.length,
      archivedCount: archivedAccounts.length,
    };
  }, [accounts, showArchived]);

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  const cleanupDragPreview = (): void => {
    if (dragPreviewElementRef.current && dragPreviewElementRef.current.parentNode) {
      dragPreviewElementRef.current.parentNode.removeChild(dragPreviewElementRef.current);
    }
    dragPreviewElementRef.current = null;
  };

  const createDragPreview = (event: DragEvent<HTMLButtonElement>): void => {
    const dragCard = event.currentTarget.closest('.accounts-list__item');
    if (!dragCard) {
      cleanupDragPreview();
      return;
    }

    const node = dragCard.cloneNode(true) as HTMLDivElement;
    const { clientX, clientY } = event.nativeEvent;
    const rect = dragCard.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    node.style.position = 'fixed';
    node.style.left = '-9999px';
    node.style.top = '-9999px';
    node.style.width = `${rect.width}px`;
    node.style.pointerEvents = 'none';
    node.style.zIndex = '2147483647';
    node.classList.add('accounts-list__item--drag-preview');

    document.body.appendChild(node);
    dragPreviewElementRef.current = node;
    event.dataTransfer.setDragImage(node, offsetX, offsetY);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, accountId: string): void => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', accountId);
    createDragPreview(event);
    document.body.style.cursor = 'grab';
    document.documentElement.style.cursor = 'grab';
    document.documentElement.classList.add('accounts-dragging');
    setDraggingId(accountId);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>, targetId: string): void => {
    event.preventDefault();
    if (!draggingId || draggingId === targetId) {
      return;
    }

    const { top, height } = event.currentTarget.getBoundingClientRect();
    const shouldPlaceAfter = event.clientY - top > height / 2;

    setAccounts((previous) => reorderAccounts(previous, draggingId, targetId, shouldPlaceAfter));

    setDragOverId(targetId);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>, targetId: string): void => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string): void => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingId;

    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      cleanupDragPreview();
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      document.documentElement.classList.remove('accounts-dragging');
      return;
    }
    cleanupDragPreview();
    setDraggingId(null);
    setDragOverId(null);
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    document.documentElement.classList.remove('accounts-dragging');
    document.documentElement.style.cursor = '';
  };

  const handleDragEnd = (): void => {
    cleanupDragPreview();
    setDraggingId(null);
    setDragOverId(null);
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    document.documentElement.classList.remove('accounts-dragging');
  };

  const handleOpenAddModal = (): void => {
    setShowAddModal(true);
  };

  const resetAddAccountForm = (): void => {
    const nextForm = createEmptyAccountForm();
    setNewAccountForm(nextForm);
    setColorHexInput(nextForm.color);
  };

  const handleCloseAddModal = (): void => {
    setShowAddModal(false);
    resetAddAccountForm();
  };

  const handleFormFieldChange = (field: keyof NewAccountForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { value } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleColorTextChange = (event: ChangeEvent<HTMLInputElement>): void => {
    let value = event.target.value.replace(/[^#0-9a-fA-F]/g, '');
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    value = value.slice(0, 7);
    setColorHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setNewAccountForm((previous) => ({
        ...previous,
        color: value,
      }));
    }
  };

  const handleColorPickerChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setColorHexInput(value);
    setNewAccountForm((previous) => ({
      ...previous,
      color: value,
    }));
  };

  const handleExcludeToggle = (event: ChangeEvent<HTMLInputElement>): void => {
    const { checked } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      excludeFromStatistics: checked,
    }));
  };

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedName = newAccountForm.name.trim();
    if (!trimmedName) {
      return;
    }

    const accountTypeMeta =
      ACCOUNT_TYPES.find((type) => type.value === newAccountForm.accountType) ?? ACCOUNT_TYPES[0];

    const selectedIconKey = newAccountForm.iconKey || defaultIconKey;
    const ResolvedIconComponent =
      resolveIconComponent(selectedIconKey) ?? (accountTypeMeta.icon ?? FaWallet);

    const maxOrder = accounts.reduce((max, account) => Math.max(max, account.order ?? 0), 0);

    const nextAccount: Account = {
      id: generateAccountId(trimmedName),
      order: maxOrder + 1,
      name: trimmedName,
      type: newAccountForm.accountType,
      balance: parseFloat(newAccountForm.initialAmount || '0') || 0,
      icon: ResolvedIconComponent,
      accentColor: newAccountForm.color,
      backgroundColor: lightenColor(newAccountForm.color),
      excludeFromStatistics: newAccountForm.excludeFromStatistics,
      currency: newAccountForm.currency,
      isActive: newAccountForm.isActive,
      usability: newAccountForm.usability,
    };

    setAccounts((previous) => [...previous, nextAccount]);
    handleCloseAddModal();
  };

  const selectedAccountType: AccountType =
    ACCOUNT_TYPES.find((type) => type.value === newAccountForm.accountType) ?? ACCOUNT_TYPES[0];
  const SelectedAccountTypeIcon = selectedAccountType.icon ?? FaWallet;

  // Icon selection options for account modal (similar to Categories modal)
  const availableIconKeys = useMemo<string[]>(
    () =>
      (Object.keys(FaIcons) as string[]).filter(
        (key) => key.startsWith('Fa') && !ICON_EXCLUSIONS.has(key)
      ),
    []
  );

  const defaultIconKey = useMemo<string>(
    () => availableIconKeys.find((key) => key === DEFAULT_ACCOUNT_ICON_KEY) ?? DEFAULT_ACCOUNT_ICON_KEY,
    [availableIconKeys]
  );

  const iconDropdownIcons = useMemo<Record<string, IconType>>(() => {
    const lib = FaIcons as Record<string, IconType | undefined>;
    const map: Record<string, IconType> = {};
    availableIconKeys.forEach((key) => {
      const icon = lib[key];
      if (icon) {
        map[key] = icon;
      }
    });
    return map;
  }, [availableIconKeys]);

  const iconColorMap = useMemo<Record<string, string>>(
    () =>
      availableIconKeys.reduce<Record<string, string>>((acc, key) => {
        acc[key] = newAccountForm.color;
        return acc;
      }, {}),
    [availableIconKeys, newAccountForm.color]
  );

  // Local display state for Initial Amount formatting (thousands ',' and decimal '.')
  const [initialAmountDisplay, setInitialAmountDisplay] = useState<string>('');
  const [isEditingInitialAmount, setIsEditingInitialAmount] = useState<boolean>(false);


  // Sync display with form value, avoid overriding while editing
  useEffect(() => {
    if (!isEditingInitialAmount) {
      setInitialAmountDisplay(formatNumberDisplayFromValue(newAccountForm.initialAmount));
    }
  }, [newAccountForm.initialAmount, isEditingInitialAmount]);

  // Global dragover/drop handlers while dragging to avoid "not-allowed" cursor anywhere
  useEffect(() => {
    if (!draggingId) return;

    const onDragOverWindow = (e: any) => {
      e.preventDefault();
      try {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      } catch {
        /* no-op */
      }
    };
    const onDropWindow = (e: any) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', onDragOverWindow);
    window.addEventListener('drop', onDropWindow);

    return () => {
      window.removeEventListener('dragover', onDragOverWindow);
      window.removeEventListener('drop', onDropWindow);
    };
  }, [draggingId]);

  const handleInitialAmountInput = (next: string): void => {
    const { display, normalized, deferCommit } = coerceAndFormatNumber(next);
    setInitialAmountDisplay(display);
    setIsEditingInitialAmount(true);
    if (!deferCommit) {
      setNewAccountForm((prev) => ({ ...prev, initialAmount: normalized }));
    }
  };

  // Window-level drag handlers to avoid "not-allowed" cursor anywhere (including sidebar)
  useEffect(() => {
    if (!draggingId) return;

    const onDragOverWindow = (e: any) => {
      e.preventDefault();
      try {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      } catch {
        // ignore
      }
    };
    const onDropWindow = (e: any) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', onDragOverWindow);
    window.addEventListener('drop', onDropWindow);

    return () => {
      window.removeEventListener('dragover', onDragOverWindow);
      window.removeEventListener('drop', onDropWindow);
    };
  }, [draggingId]);
  return (
    <Container className="accounts-page" onDragOver={handleDragOver}>
      <Row className="align-items-stretch accounts-page__layout" onDragOver={handleDragOver}>
        <Col xl={3} lg={4} className="mb-4" onDragOver={handleDragOver}>
          <Card className="accounts-sidebar" onDragOver={handleDragOver}>
            <Card.Body onDragOver={handleDragOver}>
              <h2 className="accounts-sidebar__title">Accounts</h2>
              <p className="accounts-sidebar__caption">Organise your accounts and wallets in one place.</p>

              <Button variant="success" className="accounts-sidebar__add-btn" onClick={handleOpenAddModal}>
                <IconWrapper icon={FaPlus} className="me-2" size={14} />
                Add
              </Button>

              <div className="accounts-sidebar__switch">
                <span>Show Archived</span>
                <Form.Check
                  type="switch"
                  id="show-archived-switch"
                  className="accounts-sidebar__form-switch"
                  checked={showArchived}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setShowArchived(event.target.checked)}
                />
              </div>

              <div className="accounts-sidebar__summary">
                <div className="accounts-sidebar__summary-item">
                  <span>Total Balance</span>
                  <strong>{formatCurrency(summary.totalVisibleBalance)}</strong>
                </div>
                <div className="accounts-sidebar__summary-grid">
                  <div>
                    <span>Active</span>
                    <strong>{summary.activeCount}</strong>
                  </div>
                  <div>
                    <span>Archived</span>
                    <strong>{summary.archivedCount}</strong>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={9} lg={8} onDragOver={handleDragOver}>
          <div className="accounts-list" onDragOver={handleDragOver}>
            {filteredAccounts.map((account) => {
              const IconComponent = account.icon;
              const isDragging = draggingId === account.id;
              const isDragOver = dragOverId === account.id;

              return (
                <Card
                  key={account.id}
                  className={`accounts-list__item${isDragging ? ' accounts-list__item--dragging' : ''}${isDragOver ? ' accounts-list__item--drag-over' : ''
                    }`}
                  onDragEnter={(event: DragEvent<HTMLDivElement>) => handleDragEnter(event, account.id)}
                  onDragOver={handleDragOver}
                  onDragLeave={(event: DragEvent<HTMLDivElement>) => handleDragLeave(event, account.id)}
                  onDrop={(event: DragEvent<HTMLDivElement>) => handleDrop(event, account.id)}
                >
                  <Card.Body className="accounts-list__body" onDragOver={handleDragOver}>
                    <div
                      className="accounts-list__icon"
                      style={{ backgroundColor: account.backgroundColor, color: account.accentColor }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="accounts-list__details">
                      <span className="accounts-list__name">{account.name}</span>
                      <span className="accounts-list__type">{account.type}</span>
                    </div>
                    <div
                      className={`accounts-list__balance ${account.balance < 0 ? 'accounts-list__balance--negative' : ''
                        }`}
                    >
                      {formatCurrency(account.balance)}
                    </div>
                    <Button
                      variant="light"
                      className="accounts-list__menu-btn"
                      draggable
                      onDragOver={handleDragOver}
                      onDragStart={(event: DragEvent<HTMLButtonElement>) => handleDragStart(event, account.id)}
                      onDragEnd={handleDragEnd}
                      aria-label={`Reorder ${account.name}`}
                    >
                      <IconWrapper icon={FaBars} size={20} />
                    </Button>
                  </Card.Body>
                </Card>
              );
            })}

            {filteredAccounts.length === 0 && (
              <Card className="accounts-list__empty">
                <Card.Body>
                  <div className="accounts-list__empty-icon">
                    <IconWrapper icon={FaBars} size={20} />
                  </div>
                  <h3>No accounts to show</h3>
                  <p>Toggle archived accounts or add a new one to get started.</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>

      {/* Shared Add Account Modal Component */}
      <AddAccountModal
        show={showAddModal}
        onHide={handleCloseAddModal}
        onSubmit={(form) => {
          const trimmedName = form.name.trim();
          if (!trimmedName) return;

          const accountTypeMeta =
            ACCOUNT_TYPES.find((type) => type.value === form.accountType) ?? ACCOUNT_TYPES[0];
          const ResolvedIconComponent =
            resolveIconComponent(form.iconKey) ?? (accountTypeMeta.icon ?? FaWallet);

          const maxOrder = accounts.reduce((max, account) => Math.max(max, account.order ?? 0), 0);

          const nextAccount: Account = {
            id: generateAccountId(trimmedName),
            order: maxOrder + 1,
            name: trimmedName,
            type: form.accountType,
            balance: parseFloat(form.initialAmount || '0') || 0,
            icon: ResolvedIconComponent,
            accentColor: form.color,
            backgroundColor: lightenColor(form.color),
            excludeFromStatistics: form.excludeFromStatistics,
            currency: form.currency,
            isActive: form.isActive,
            usability: form.usability,
          };

          setAccounts((previous) => [...previous, nextAccount]);
          handleCloseAddModal();
        }}
        title="Add Account"
      />
    </Container>
  );
};

export default Accounts;

