'use client';

import React, { useMemo, useRef, useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
// TODO: Simplify accounts management UI and supporting logic.
import { useRouter } from 'next/navigation';
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
  FaFolderOpen,
} from 'react-icons/fa';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { formatNumberDisplayFromValue, coerceAndFormatNumber } from '../../utils/numericInput';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { SingleCategoryDropdown } from '../Transactions/SingleCategoryDropdown';
import AddAccountModal from '../../components/AddAccountModal';
import { accountService } from '../../services/accountService';
import type { ApiAccountResponse } from '../../services/accountService';
import {
  resolveIconComponent,
  resolveIconFromApiName,
  lightenColor,
  DEFAULT_ACCOUNT_ICON_KEY,
  type Account,
} from '../../utils/accountUtils';

export type { Account };

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


const ACCOUNT_TYPES: AccountType[] = [
  { value: 'General', label: 'General', icon: FaWallet as React.ComponentType<{ size?: number }> },
  { value: 'Cash', label: 'Cash', icon: FaMoneyBillWave as React.ComponentType<{ size?: number }> },
  { value: 'Checking account-4', label: 'Checking account-4', icon: FaUniversity as React.ComponentType<{ size?: number }> },
];

const ICON_EXCLUSIONS = new Set<string>(['IconContext']);
type UsabilityOption = 'USABLE' | 'PROTECTED';
const USABILITY_OPTIONS: readonly UsabilityOption[] = ['USABLE', 'PROTECTED'] as const;


// Icon wrapper to handle icon type issues
const IconWrapper: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  size?: number;
  className?: string;
}> = ({ icon: Icon, size, className }) => <Icon size={size} className={className} />;

// Sortable Account Card Component
interface SortableAccountCardProps {
  account: Account;
  formatCurrency: (value: number) => string;
  onSelectAccount: (account: Account) => void;
  isArchived?: boolean;
}

const SortableAccountCard: React.FC<SortableAccountCardProps> = ({
  account,
  formatCurrency,
  onSelectAccount,
  isArchived = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id, disabled: isArchived });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const IconComponent = account.icon;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="accounts-list__item"
      onClick={() => onSelectAccount(account)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectAccount(account);
        }
      }}
      data-style="cursor: pointer"
    >
      <Card.Body className="accounts-list__body">
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
          className={`accounts-list__balance ${account.balance < 0 ? 'accounts-list__balance--negative' : ''}`}
        >
          {formatCurrency(account.balance)}
        </div>
        {!isArchived && (
          <Button
            variant="light"
            className="accounts-list__menu-btn"
            aria-label={`Reorder ${account.name}`}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <IconWrapper icon={FaBars} size={20} />
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

// Draggable card content component (for overlay rendering)
interface DraggableCardProps {
  account: Account;
  formatCurrency: (value: number) => string;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ account, formatCurrency }) => {
  const IconComponent = account.icon;

  return (
    <Card
      style={{
        minWidth: '350px',
        borderRadius: '1.2rem',
        boxShadow: '0 22px 45px rgba(15, 23, 42, 0.18)',
      }}
    >
      <Card.Body className="accounts-list__body">
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
          className={`accounts-list__balance ${account.balance < 0 ? 'accounts-list__balance--negative' : ''}`}
        >
          {formatCurrency(account.balance)}
        </div>
        <div
          style={{
            marginLeft: '0.75rem',
            width: '42px',
            height: '42px',
            borderRadius: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          <IconWrapper icon={FaBars} size={20} />
        </div>
      </Card.Body>
    </Card>
  );
};

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



const Accounts: React.FC = () => {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [inactiveAccountCount, setInactiveAccountCount] = useState<number>(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newAccountForm, setNewAccountForm] = useState<NewAccountForm>(() => createEmptyAccountForm());
  const [colorHexInput, setColorHexInput] = useState<string>(() => createEmptyAccountForm().color);
  const [isReordering, setIsReordering] = useState<boolean>(false);

  const colorPickerInputRef = useRef<HTMLInputElement>(null);
  const fetchedRef = useRef<boolean>(false);
  const reorderingRef = useRef<boolean>(false);

  // DnD-Kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Fetch accounts from API on mount
  useEffect(() => {
    // Prevent double fetching in StrictMode or multiple mounts
    if (fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    const load = async (): Promise<void> => {
      try {
        const apiAccounts = (await accountService.fetchAccounts()) as ApiAccountResponse[];

        const sorted = [...apiAccounts].sort((a, b) => {
          const ap = (a.position ?? 0);
          const bp = (b.position ?? 0);
          if (ap !== bp) {return ap - bp;}
          return ((a.personal_id ?? 0) - (b.personal_id ?? 0));
        });

        // Count inactive accounts (active: false)
        const inactiveCount = sorted.filter((a) => a.active === false).length;
        setInactiveAccountCount(inactiveCount);

        // Map ALL accounts (including inactive ones) so toggle can show/hide them
        const mapped: Account[] = sorted
          .filter((a) => a.id) // Only process accounts with valid IDs from API
          .map((a, idx) => {
            const IconComp =
              resolveIconFromApiName(a.icon) ?? (FaWallet as React.ComponentType<{ size?: number }>);
            const color = (typeof a.color === 'string' && a.color) ? a.color : '#047857';
            const usabilityStr = typeof a.usability === 'string' ? a.usability.toUpperCase() : undefined;
            const usability: UsabilityOption = usabilityStr === 'PROTECTED' ? 'PROTECTED' : 'USABLE';
            const iconKey = typeof a.icon === 'string' && a.icon ? a.icon : DEFAULT_ACCOUNT_ICON_KEY;

            return {
              id: a.id!,
              personal_id: a.personal_id,
              order: idx + 1,
              name: a.name ?? 'Unnamed Account',
              type: a.account_type ?? 'General',
              balance: a.initial_amount ?? 0,
              icon: IconComp,
              accentColor: color,
              backgroundColor: lightenColor(color),
              isActive: a.active ?? true,
              isArchived: a.active === false,
              usability,
              iconKey,
            };
          });

        setAccounts(mapped);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load accounts:', error);
      }
    };

    void load();
  }, []);
  
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
    const visibleAccounts = showArchived ? accounts : activeAccounts;

    return {
      totalVisibleBalance: visibleAccounts.reduce((total, account) => total + account.balance, 0),
      activeCount: activeAccounts.length,
      archivedCount: inactiveAccountCount,
    };
  }, [accounts, inactiveAccountCount, showArchived]);

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Store the current accounts to extract swap details
      setAccounts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {return items;}

        // Get the accounts being swapped before reordering
        const draggedAccount = items[oldIndex];
        const targetAccount = items[newIndex];

        // Swap personal_id values between the two accounts
        const tempPersonalId = draggedAccount.personal_id;
        draggedAccount.personal_id = targetAccount.personal_id;
        targetAccount.personal_id = tempPersonalId;

        // Reorder items
        const reordered = arrayMove(items, oldIndex, newIndex);

        reordered.forEach((account, index) => {
          account.order = index + 1;
        });

        // Call API to update account order with all reordered items
        // Prevent multiple API calls for the same reorder action
        if (!reorderingRef.current) {
          reorderingRef.current = true;
          setIsReordering(true);
          void (async () => {
            try {
              // Build order_map with all accounts that have personal_id
              const orderMap = reordered
                .filter((acc) => acc.personal_id)
                .map((acc) => ({
                  id: acc.id,
                  personal_id: acc.personal_id!,
                }));

              if (orderMap.length > 0) {
                await accountService.swapAccountOrder({
                  order_map: orderMap,
                });
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Failed to update account order:', error);
              // Note: UI has already been updated optimistically, could add error toast here
            } finally {
              reorderingRef.current = false;
              setIsReordering(false);
            }
          })();
        }

        return reordered;
      });
    }
  }, []);

  const handleDragCancel = useCallback((): void => {
    setActiveId(null);
  }, []);

  const handleDragStartWrapper = useCallback((event: DragEndEvent): void => {
    setActiveId(event.active.id as string);
  }, []);

  const handleOpenAddModal = (): void => {
    setShowAddModal(true);
  };

  const handleSelectAccount = (account: Account): void => {
    router.push(`/accounts/${account.id}?from=accounts`);
  };

  const handleDeleteAccount = (accountId: string): void => {
    setAccounts((previous) => previous.filter((acc) => acc.id !== accountId));
    // TODO: Add API call to delete the account on the backend
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

  const refreshAccounts = async (): Promise<void> => {
    try {
      const apiAccounts = (await accountService.fetchAccounts()) as ApiAccountResponse[];

      const sorted = [...apiAccounts].sort((a, b) => {
        const ap = (a.position ?? 0);
        const bp = (b.position ?? 0);
        if (ap !== bp) {return ap - bp;}
        return ((a.personal_id ?? 0) - (b.personal_id ?? 0));
      });

      const inactiveCount = sorted.filter((a) => a.active === false).length;
      setInactiveAccountCount(inactiveCount);

      const mapped: Account[] = sorted
        .filter((a) => a.id)
        .map((a, idx) => {
          const IconComp =
            resolveIconFromApiName(a.icon) ?? (FaWallet as React.ComponentType<{ size?: number }>);
          const color = (typeof a.color === 'string' && a.color) ? a.color : '#047857';
          const usabilityStr = typeof a.usability === 'string' ? a.usability.toUpperCase() : undefined;
          const usability: UsabilityOption = usabilityStr === 'PROTECTED' ? 'PROTECTED' : 'USABLE';
          const iconKey = typeof a.icon === 'string' && a.icon ? a.icon : DEFAULT_ACCOUNT_ICON_KEY;

          return {
            id: a.id!,
            personal_id: a.personal_id,
            order: idx + 1,
            name: a.name ?? 'Unnamed Account',
            type: a.account_type ?? 'General',
            balance: a.initial_amount ?? 0,
            icon: IconComp,
            accentColor: color,
            backgroundColor: lightenColor(color),
            isActive: a.active ?? true,
            isArchived: a.active === false,
            usability,
            iconKey,
          };
        });

      setAccounts(mapped);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh accounts:', error);
    }
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


  const handleInitialAmountInput = (next: string): void => {
    const { display, normalized, deferCommit } = coerceAndFormatNumber(next);
    setInitialAmountDisplay(display);
    setIsEditingInitialAmount(true);
    if (!deferCommit) {
      setNewAccountForm((prev) => ({ ...prev, initialAmount: normalized }));
    }
  };


  return (
    <Container fluid className="accounts-page">
      <Row className="align-items-stretch accounts-page__layout">
        <Col xl={3} lg={4} className="mb-4">
          <Card className="accounts-sidebar">
            <Card.Body>
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

        <Col xl={9} lg={8}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartWrapper}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={filteredAccounts.filter((a) => !a.isArchived).map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="accounts-list">
                {(() => {
                  const activeAccountsList = filteredAccounts.filter((account) => !account.isArchived);
                  const archivedAccountsList = filteredAccounts.filter((account) => account.isArchived);

                  return (
                    <>
                      {/* Active Accounts */}
                      {activeAccountsList.map((account) => (
                        <SortableAccountCard
                          key={account.id}
                          account={account}
                          formatCurrency={formatCurrency}
                          onSelectAccount={handleSelectAccount}
                          isArchived={false}
                        />
                      ))}

                      {/* Archived Section */}
                      {showArchived && archivedAccountsList.length > 0 && (
                        <>
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '1.5rem 0 1rem 0',
                              color: '#64748b',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Archived
                          </div>
                          {archivedAccountsList.map((account) => (
                            <SortableAccountCard
                              key={account.id}
                              account={account}
                              formatCurrency={formatCurrency}
                              onSelectAccount={handleSelectAccount}
                              isArchived={true}
                            />
                          ))}
                        </>
                      )}

                      {filteredAccounts.length === 0 && (
                        <Card className="accounts-list__empty">
                          <Card.Body>
                            <div className="accounts-list__empty-icon">
                              <IconWrapper icon={FaFolderOpen} size={20} />
                            </div>
                            <h3>No accounts to show</h3>
                            <p>Toggle archived accounts or add a new one to get started.</p>
                          </Card.Body>
                        </Card>
                      )}
                    </>
                  );
                })()}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId
                ? (() => {
                    const account = accounts.find((a) => a.id === activeId);
                    return account ? (
                      <DraggableCard account={account} formatCurrency={formatCurrency} />
                    ) : null;
                  })()
                : null}
            </DragOverlay>
          </DndContext>
        </Col>
      </Row>

      {/* Shared Add Account Modal Component */}
      <AddAccountModal
        show={showAddModal}
        onHide={handleCloseAddModal}
        onSubmit={async () => {
          // Account creation is handled by the modal's internal API call
          // Just refresh the accounts list after successful creation
          await refreshAccounts();
          handleCloseAddModal();
        }}
        title="Add Account"
      />
    </Container>
  );
};

export default Accounts;

