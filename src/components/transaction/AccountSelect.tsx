'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaSearch } from 'react-icons/fa';
import type { Account } from '@/services/accountService';
import { getIconComponent } from '@/utils/iconUtils';
import { ClearButton } from '@/components/common/ClearButton';

interface AccountSelectProps {
  selectedAccountId: string | null;
  onSelect: (accountId: string | null) => void;
  accounts: Account[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  excludeId?: string;
}

export const AccountSelect: React.FC<AccountSelectProps> = ({
  selectedAccountId,
  onSelect,
  accounts,
  placeholder = 'Select account',
  searchPlaceholder = 'Search accounts...',
  disabled = false,
  excludeId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  // Filter accounts based on search and exclusions
  const filteredAccounts = accounts.filter(account => {
    if (excludeId && account.id === excludeId) return false;
    if (!search) return true;
    return account.name.toLowerCase().includes(search.toLowerCase());
  });

  const hasResults = filteredAccounts.length > 0;

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  };

  // Handle account selection
  const handleSelect = (accountId: string | null) => {
    onSelect(accountId);
    setIsOpen(false);
    setSearch('');
  };

  // Handle clear button
  const handleClear = () => {
    onSelect(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get account icon
  const getAccountIcon = (account: Account) => {
    if (!account.icon) return null;
    const IconComponent = getIconComponent(account.icon);
    return IconComponent ? <IconComponent size={16} /> : null;
  };

  return (
    <div ref={dropdownRef} className="position-relative">
      {/* Selected Value Display */}
      <div
        className={`form-control d-flex align-items-center justify-content-between ${
          disabled ? 'disabled' : 'cursor-pointer'
        } ${isOpen ? 'border-primary' : ''}`}
        onClick={toggleDropdown}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          {selectedAccount ? (
            <>
              {selectedAccount.icon && (
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: selectedAccount.color || '#6c757d',
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {getAccountIcon(selectedAccount)}
                </span>
              )}
              <span className="d-inline-flex align-items-center gap-1">
                {selectedAccount.name}
                {!disabled && (
                  <ClearButton
                    size={12}
                    ariaLabel="Clear account"
                    onClick={handleClear}
                  />
                )}
              </span>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">▼</span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1050,
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-bottom sticky-top bg-white">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <FaSearch size={12} className="text-muted" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control border-start-0"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Account List */}
          <div className="list-group list-group-flush">
            {hasResults ? (
              filteredAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 border-0 ${
                    selectedAccountId === account.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelect(account.id)}
                >
                  {account.icon && (
                    <span
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: account.color || '#6c757d',
                        color: 'white',
                        fontSize: '12px',
                      }}
                    >
                      {getAccountIcon(account)}
                    </span>
                  )}
                  <span className="flex-grow-1">{account.name}</span>
                  {selectedAccountId === account.id && (
                    <span className="text-primary">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-muted">
                <small>No accounts found</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
