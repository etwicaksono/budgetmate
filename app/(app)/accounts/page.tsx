'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { FaPlus, FaBars, FaFolderOpen } from 'react-icons/fa';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AccountModal from '@/components/accounts/AccountModal';
import { CardSkeleton } from '@/components/Loading';
import { useAccountModal } from '@/hooks/useAccountModal';
import { accountService, type Account } from '@/services/accountService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import {
  FaWallet,
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
  FaChartLine,
  FaGift,
  FaShieldAlt,
  FaHandHoldingUsd,
  FaHome,
  FaExclamationTriangle,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useNetWorth } from '@/hooks/useNetWorth';
import { NetWorthWidget } from '@/components/dashboard/widgets';
import { localStorageService } from '@/mocks/localStorageService';
import './Accounts.css';

// Map icon strings to components
const getIconComponent = (iconName: string): IconType => {
  const iconMap: Record<string, IconType> = {
    FaWallet,
    FaUniversity,
    FaPiggyBank,
    FaCreditCard,
    FaMoneyBillWave,
    FaChartLine,
    FaGift,
    FaShieldAlt,
    FaHandHoldingUsd,
    FaHome,
    FaExclamationTriangle,
  };
  return iconMap[iconName] || FaWallet;
};

// Lighten color for background
const lightenColor = (color: string, percent = 85): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.floor(((num >> 16) + 255 * (percent / 100)) / (1 + percent / 100)));
  const g = Math.min(255, Math.floor((((num >> 8) & 0x00ff) + 255 * (percent / 100)) / (1 + percent / 100)));
  const b = Math.min(255, Math.floor(((num & 0x0000ff) + 255 * (percent / 100)) / (1 + percent / 100)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// Sortable Account Card Component
interface SortableAccountCardProps {
  account: Account;
  onSelect: (account: Account) => void;
  isArchived?: boolean;
}

const SortableAccountCard: React.FC<SortableAccountCardProps> = ({
  account,
  onSelect,
  isArchived = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: account.id, disabled: isArchived });
  const { formatCurrency } = useFormattedCurrency();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
  };

  const IconComponent = getIconComponent(account.icon);
  const backgroundColor = lightenColor(account.color);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="accounts-list__item"
      onClick={() => onSelect(account)}
      role="button"
      tabIndex={0}
    >
      <Card.Body className="accounts-list__body">
        <div
          className="accounts-list__icon"
          style={{ backgroundColor, color: account.color }}
        >
          <IconComponent size={20} />
        </div>
        <div className="accounts-list__content">
          <div className="accounts-list__details">
            <span className="accounts-list__name">{account.name}</span>
            <span className="accounts-list__type">{account.account_type}</span>
          </div>
          <div
            className={`accounts-list__balance ${account.current_balance < 0 ? 'accounts-list__balance--negative' : ''}`}
          >
            {formatCurrency(account.current_balance)}
          </div>
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
            <FaBars size={20} />
          </Button>
        )}
      </Card.Body>
    </Card>
  );
};

const AccountsSidebarSkeleton: React.FC = () => (
  <div className="d-flex flex-column gap-3 w-100">
    <style jsx>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .skeleton-block {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
    `}</style>
    <div className="skeleton-block" style={{ height: '32px', width: '50%', borderRadius: '4px' }} />
    <div className="skeleton-block" style={{ height: '16px', width: '80%', borderRadius: '4px' }} />
    <div className="skeleton-block mt-1" style={{ height: '44px', width: '100%', borderRadius: '999px' }} />
    <div className="d-flex justify-content-between mt-2 align-items-center">
      <div className="skeleton-block" style={{ height: '20px', width: '40%', borderRadius: '4px' }} />
      <div className="skeleton-block" style={{ height: '24px', width: '40px', borderRadius: '1rem' }} />
    </div>
    <div className="skeleton-block mt-2" style={{ height: '180px', width: '100%', borderRadius: '1.1rem' }} />
  </div>
);

const AccountsPage: React.FC = () => {
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [includeDraft, setIncludeDraft] = useState<boolean>(() => localStorageService.loadIncludeDraft());
  const { formatCurrency } = useFormattedCurrency();
  const router = useRouter();

  // Net Worth data for sidebar
  const { data: netWorthData, accountBalance: netWorthAccountBalance, totalCredit: netWorthTotalCredit, totalDebt: netWorthTotalDebt, isLoading: netWorthLoading } = useNetWorth(includeDraft);

  const formatCurrencyValue = useCallback(
    (value: number): string => {
      const formatted = formatCurrency(Math.abs(value));
      return `${value < 0 ? '-' : ''}${formatted}`;
    },
    [formatCurrency]
  );

  // Account Modal hook (DRY principle)
  const accountModal = useAccountModal(async () => {
    await fetchAccounts();
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await accountService.fetchAccounts({ include_draft: includeDraft });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [includeDraft]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Auto-refresh when transactions or accounts are created/updated/deleted
  useEffect(() => {
    const handleTransactionChange = () => {
      fetchAccounts(); // Refresh to get updated balances
    };

    const handleAccountChange = () => {
      fetchAccounts(); // Refresh to get updated account list
    };

    // Listen for transaction events (affects account balances)
    window.addEventListener('transaction-created', handleTransactionChange);
    window.addEventListener('transaction-updated', handleTransactionChange);
    window.addEventListener('transaction-deleted', handleTransactionChange);

    // Listen for account events
    window.addEventListener('account-created', handleAccountChange);
    window.addEventListener('account-updated', handleAccountChange);
    window.addEventListener('account-deleted', handleAccountChange);

    return () => {
      window.removeEventListener('transaction-created', handleTransactionChange);
      window.removeEventListener('transaction-updated', handleTransactionChange);
      window.removeEventListener('transaction-deleted', handleTransactionChange);
      window.removeEventListener('account-created', handleAccountChange);
      window.removeEventListener('account-updated', handleAccountChange);
      window.removeEventListener('account-deleted', handleAccountChange);
    };
  }, [fetchAccounts]);

  // Filter accounts based on archived status
  const filteredAccounts = useMemo((): Account[] => {
    const relevantAccounts = showArchived ? accounts : accounts.filter((account) => account.is_active);
    return [...relevantAccounts].sort((a, b) => {
      // First sort by order (if available, defaulting to 0)
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Fallback to created_at
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [accounts, showArchived]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const activeAccounts = accounts.filter((account) => account.is_active);
    const archivedAccounts = accounts.filter((account) => !account.is_active);
    const visibleAccounts = showArchived ? accounts : activeAccounts;

    const totalBalance = visibleAccounts
      .filter((a) => a.is_included_in_total)
      .reduce((sum, account) => sum + account.current_balance, 0);

    return {
      totalBalance,
      activeCount: activeAccounts.length,
      archivedCount: archivedAccounts.length,
    };
  }, [accounts, showArchived]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAccounts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return items;

        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update the order property directly on the local state objects
        // so that the useMemo sort function renders them correctly immediately
        const updatedItems = reordered.map((account, index) => ({
          ...account,
          order: index + 1,
        }));

        // Call API to update account order
        void (async () => {
          try {
            const orderMap = updatedItems.map((account) => ({
              id: account.id,
              order: account.order,
            }));

            await accountService.swapAccountOrder(orderMap);
          } catch (error) {
            console.error('Failed to update account order:', error);
          }
        })();

        return updatedItems;
      });
    }
  }, []);

  // Handle account selection
  const handleSelectAccount = (account: Account): void => {
    router.push(`/accounts/${account.id}`);
  };

  // Separate active and archived accounts
  const activeAccounts = filteredAccounts.filter((account) => account.is_active);
  const archivedAccounts = filteredAccounts.filter((account) => !account.is_active);

  return (
    <Container fluid className="accounts-page">
      <Row className="g-4">
        {/* Sidebar */}
        <Col xl={3} lg={4} xs={12} className="p-0">
          <Card className="accounts-sidebar">
            <Card.Body>
              {isLoading ? (
                <AccountsSidebarSkeleton />
              ) : (
                <>
                  <h2 className="accounts-sidebar__title">Accounts</h2>
                  <p className="accounts-sidebar__caption">
                    Organise your accounts and wallets in one place.
                  </p>

                  <Button
                    variant="primary"
                    className="accounts-sidebar__add-btn"
                    onClick={accountModal.openAddModal}
                  >
                    <FaPlus className="me-2" size={14} />
                    Add
                  </Button>

                  <div className="accounts-sidebar__switch">
                    <span>Show Archived</span>
                    <Form.Check
                      type="switch"
                      id="show-archived-switch"
                      className="accounts-sidebar__form-switch"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                  </div>

                  <div className="accounts-sidebar__summary">
                    <div className="accounts-sidebar__summary-item">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="accounts-sidebar__summary-title" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6c757d' }}>Net Worth</span>
                      </div>
                      <NetWorthWidget
                        data={netWorthData}
                        accountBalance={netWorthAccountBalance}
                        totalCredit={netWorthTotalCredit}
                        totalDebt={netWorthTotalDebt}
                        isLoading={netWorthLoading}
                        formatCurrencyValue={formatCurrencyValue}
                        compact={true}
                        includeDraft={includeDraft}
                        onToggleDraft={(next) => {
                          setIncludeDraft(next);
                          localStorageService.saveIncludeDraft(next);
                        }}
                      />
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
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Accounts List */}
        <Col xl={9} lg={8} xs={12} className="p-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeAccounts.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="accounts-list ps-lg-3">
                {isLoading ? (
                  <div className="d-flex flex-column gap-3 w-100">
                    {[1, 2, 3, 4].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Active Accounts */}
                    {activeAccounts.map((account) => (
                      <SortableAccountCard
                        key={account.id}
                        account={account}
                        onSelect={handleSelectAccount}
                        isArchived={false}
                      />
                    ))}

                    {/* Archived Section */}
                    {showArchived && archivedAccounts.length > 0 && (
                      <>
                        <div className="accounts-list__archived-header">Archived</div>
                        {archivedAccounts.map((account) => (
                          <SortableAccountCard
                            key={account.id}
                            account={account}
                            onSelect={handleSelectAccount}
                            isArchived={true}
                          />
                        ))}
                      </>
                    )}

                    {/* Empty State */}
                    {filteredAccounts.length === 0 && (
                      <Card className="accounts-list__empty">
                        <Card.Body>
                          <div className="accounts-list__empty-icon">
                            <FaFolderOpen size={20} />
                          </div>
                          <h3>No accounts to show</h3>
                          <p>Toggle archived accounts or add a new one to get started.</p>
                        </Card.Body>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </Col>
      </Row>

      {/* Account Modal */}
      {accountModal.showModal && (
        <AccountModal
          show={accountModal.showModal}
          onHide={accountModal.closeModal}
          onSave={accountModal.saveAccount}
          mode={accountModal.modalMode}
          initialData={accountModal.initialData}
        />
      )}
    </Container>
  );
};

export default AccountsPage;
