import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Form } from 'react-bootstrap';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { AccountDropdownItem } from './AccountDropdownItem';
import { ClearButton } from '@/components/common/ClearButton';

type AccountColorMap = Record<string, string>;
type IconComponent = ComponentType<{ className?: string; size?: number }>;

interface AccountDropdownProps {
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  accountColors: AccountColorMap;
  accountIcons?: Record<string, string | undefined>;
  allAccounts: string[];
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  isSingleSelect?: boolean;
  leadingIcon?: IconComponent | IconType | null;
}

const DEFAULT_COLOR = '#6c757d';

const resolveCategoryColor = (value: string | null | undefined): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : DEFAULT_COLOR;
};

const coerceIconComponent = (icon: IconComponent | IconType | undefined | null): IconComponent | null => {
  if (!icon) {
    return null;
  }
  return icon as unknown as IconComponent;
};

const CaretDownIcon = coerceIconComponent(FaCaretDown);
const CaretRightIcon = coerceIconComponent(FaCaretRight);

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  selectedAccounts,
  setSelectedAccounts,
  accountColors,
  accountIcons = {},
  allAccounts,
  entityLabelSingular: _entityLabelSingular = 'account',
  entityLabelPlural,
  searchPlaceholder,
  isSingleSelect = false,
  leadingIcon = null,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [accountSearch, setAccountSearch] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const referenceRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const floatingData = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip({
        padding: 8,
      }),
      shift({
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { floatingStyles } = floatingData;
  const placeholderText = `All ${entityLabelPlural}`;
  const LeadingIcon = coerceIconComponent(leadingIcon);
  const leadingPaddingLeft = LeadingIcon ? '2.5rem' : '0.75rem';

  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) {
      return allAccounts;
    }

    const searchLower = accountSearch.toLowerCase();
    return allAccounts.filter((account) =>
      account.toLowerCase().includes(searchLower)
    );
  }, [accountSearch, allAccounts]);

  const toggleAccount = useCallback(
    (account: string) => {
      setSelectedAccounts((previous) => {
        if (isSingleSelect) {
          return previous.includes(account) ? [] : [account];
        }

        if (previous.includes(account)) {
          return previous.filter((entry) => entry !== account);
        }

        return [...previous, account];
      });

      if (accountSearch) {
        setAccountSearch('');
      }
    },
    [setSelectedAccounts, accountSearch, isSingleSelect],
  );

  const isAccountSelected = useCallback(
    (account: string): boolean => {
      return selectedAccounts.includes(account);
    },
    [selectedAccounts],
  );

  const clearSelectedAccounts = useCallback(() => {
    setSelectedAccounts([]);
  }, [setSelectedAccounts]);

  const areAllSelected = selectedAccounts.length === allAccounts.length && allAccounts.length > 0;

  const toggleSelectAll = useCallback(() => {
    if (areAllSelected) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts([...allAccounts]);
    }
  }, [areAllSelected, allAccounts, setSelectedAccounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;

      const target = event.target as Node | null;
      if (!target) return;

      const isClickOnReference = referenceRef.current && referenceRef.current.contains(target);
      const isClickOnFloating = floatingRef.current && floatingRef.current.contains(target);

      if (!isClickOnReference && !isClickOnFloating) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setAccountSearch('');
    }
  }, [isOpen]);

  const focusInput = () => {
    const triggerFocus = () => {
      inputRef.current?.focus();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(triggerFocus);
    } else {
      window.setTimeout(triggerFocus, 0);
    }
  };

  const handleContainerClick = () => {
    setIsOpen((previous) => {
      const nextIsOpen = !previous;
      if (!previous) {
        focusInput();
      }
      return nextIsOpen;
    });
  };

  const referenceWidth = referenceRef.current?.offsetWidth ?? 300;
  const dropdownMinWidth = referenceWidth.toString() + 'px';
  const selectedCount = selectedAccounts.length;

  return (
    <div
      className="position-relative"
      ref={(el) => {
        referenceRef.current = el;
        floatingData.refs.setReference(el);
      }}
    >
      <div
        className="d-flex flex-wrap align-items-center"
        style={{
          minHeight: '38px',
          border: '1px solid #ced4da',
          borderRadius: '0.375rem',
          padding: `0.375rem 2rem 0.375rem ${leadingPaddingLeft}`,
          cursor: 'pointer',
          position: 'relative',
          backgroundColor: '#fff',
        }}
        onClick={handleContainerClick}
      >
        {LeadingIcon && (
          <span className="position-absolute start-0 ms-2">
            <LeadingIcon size={16} />
          </span>
        )}
        <div className="d-flex flex-wrap align-items-center flex-grow-1 gap-1">
          {selectedAccounts.length === 0 && <span className="text-muted small">{placeholderText}</span>}
          {selectedAccounts.length > 0 && (
            <span className="d-inline-flex align-items-center gap-1 small text-muted">
              {selectedCount} selected
              {!isSingleSelect && (
                <ClearButton
                  size={12}
                  ariaLabel="Clear selection"
                  onClick={clearSelectedAccounts}
                />
              )}
            </span>
          )}
        </div>
        <span
          className="position-absolute"
          style={{ right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {CaretDownIcon && CaretRightIcon && (isOpen ? <CaretDownIcon /> : <CaretRightIcon />)}
        </span>
      </div>
      {isOpen && (
        <div
          ref={(el) => {
            floatingRef.current = el;
            floatingData.refs.setFloating(el);
          }}
          className="bg-white border rounded shadow-sm"
          style={{
            position: floatingStyles.position as 'absolute' | 'fixed',
            top: floatingStyles.top ?? 0,
            left: floatingStyles.left ?? 0,
            minWidth: dropdownMinWidth,
            zIndex: 1050,
            pointerEvents: 'auto',
          }}
        >
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <Form.Control
                ref={inputRef}
                type="text"
                size="sm"
                placeholder={searchPlaceholder}
                value={accountSearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setAccountSearch(event.target.value);
                }}
                autoComplete="off"
                onClick={(event: ReactMouseEvent<HTMLInputElement>) => {
                  event.stopPropagation();
                }}
              />
              {accountSearch && (
                <ClearButton
                  className="position-absolute top-50 end-0 translate-middle-y"
                  onClick={() => {
                    setAccountSearch('');
                    focusInput();
                  }}
                />
              )}
            </div>
          </div>
          {!isSingleSelect && (
            <div className="px-2 py-1 border-bottom bg-light">
              <Form.Check
                type="checkbox"
                id="select-all-accounts"
                label={areAllSelected ? "Unselect All" : "Select All"}
                checked={areAllSelected}
                onChange={toggleSelectAll}
                className="small text-muted mb-0"
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredAccounts.length === 0 ? (
              <div className="p-3 text-center text-muted small">No accounts found</div>
            ) : (
              filteredAccounts.map((account) => {
                const color = resolveCategoryColor(accountColors[account]);
                const icon = accountIcons[account];
                const isSelected = isAccountSelected(account);

                return (
                  <AccountDropdownItem
                    key={account}
                    name={account}
                    color={color}
                    icon={icon}
                    isSelected={isSelected}
                    onClick={() => toggleAccount(account)}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
