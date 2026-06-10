'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaCheck, FaWallet, FaHandHoldingUsd, FaMoneyBillWave, FaFileAlt } from 'react-icons/fa';
import type { CurrencyNetWorth } from '@/hooks/useNetWorth';
import './NetWorthWidget.css';

const STORAGE_KEY = 'net-worth-toggle-state';

interface ToggleState {
  credit: boolean;
  debt: boolean;
}

const DEFAULT_TOGGLE: ToggleState = { credit: true, debt: true };

function loadToggleState(): ToggleState {
  if (typeof window === 'undefined') return DEFAULT_TOGGLE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        credit: typeof parsed.credit === 'boolean' ? parsed.credit : true,
        debt: typeof parsed.debt === 'boolean' ? parsed.debt : true,
      };
    }
  } catch { /* ignore */ }
  return DEFAULT_TOGGLE;
}

function saveToggleState(state: ToggleState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export interface NetWorthWidgetProps {
  data: CurrencyNetWorth[];
  isLoading: boolean;
  formatCurrencyValue: (value: number, currency: string) => string;
  compact?: boolean;
  includeDraft?: boolean;
  onToggleDraft?: (val: boolean) => void;
}

export const NetWorthWidget: React.FC<NetWorthWidgetProps> = ({
  data,
  isLoading,
  formatCurrencyValue,
  compact = false,
  includeDraft,
  onToggleDraft,
}) => {
  const [toggle, setToggle] = useState<ToggleState>(DEFAULT_TOGGLE);

  // Load from localStorage on mount
  useEffect(() => {
    setToggle(loadToggleState());
  }, []);

  const handleToggle = useCallback((key: 'credit' | 'debt') => {
    setToggle((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveToggleState(next);
      return next;
    });
  }, []);

  const computeNetWorth = useCallback(
    (item: CurrencyNetWorth): number => {
      let total = item.accountBalance;
      if (toggle.credit) total += item.totalCredit;
      if (toggle.debt) total -= item.totalDebt;
      return total;
    },
    [toggle]
  );

  if (isLoading) {
    return (
      <div className="net-worth-skeleton">
        <div className="net-worth-skeleton__chips">
          <div className="net-worth-skeleton__chip" />
          <div className="net-worth-skeleton__chip" />
          <div className="net-worth-skeleton__chip" />
        </div>
        <div className="net-worth-skeleton__amount" />
        <div className="net-worth-skeleton__line" />
        <div className="net-worth-skeleton__line" />
        <div className="net-worth-skeleton__line" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        No account data available
      </div>
    );
  }

  return (
    <div className={`net-worth-widget ${compact ? 'net-worth-widget--compact' : ''}`}>
      {/* Toggle Chips */}
      <div className="net-worth-chips">
        {/* Saldo - always on, locked */}
        <div className="net-worth-chip net-worth-chip--locked" title="Saldo selalu aktif">
          <FaWallet size={12} />
          <span>Saldo</span>
          <FaCheck className="net-worth-chip__check" />
        </div>

        {/* Piutang toggle */}
        <button
          type="button"
          className={`net-worth-chip net-worth-chip--credit ${toggle.credit ? 'net-worth-chip--active' : ''}`}
          onClick={() => handleToggle('credit')}
          title={toggle.credit ? 'Sembunyikan piutang' : 'Tampilkan piutang'}
        >
          <FaHandHoldingUsd size={12} />
          <span>Piutang</span>
          {toggle.credit && <FaCheck className="net-worth-chip__check" />}
        </button>

        {/* Hutang toggle */}
        <button
          type="button"
          className={`net-worth-chip net-worth-chip--debt ${toggle.debt ? 'net-worth-chip--active' : ''}`}
          onClick={() => handleToggle('debt')}
          title={toggle.debt ? 'Sembunyikan hutang' : 'Tampilkan hutang'}
        >
          <FaMoneyBillWave size={12} />
          <span>Hutang</span>
          {toggle.debt && <FaCheck className="net-worth-chip__check" />}
        </button>

        {/* Optional Draft toggle (passed from parent) */}
        {includeDraft !== undefined && onToggleDraft && (
          <button
            type="button"
            className={`net-worth-chip ${includeDraft ? 'net-worth-chip--active' : ''}`}
            onClick={() => onToggleDraft(!includeDraft)}
            title={includeDraft ? 'Exclude draft transactions' : 'Include draft transactions'}
            style={{ 
              borderColor: includeDraft ? '#f59e0b' : '#e5e7eb',
              backgroundColor: includeDraft ? '#f59e0b' : '#fff',
              color: includeDraft ? '#fff' : '#9ca3af',
              marginLeft: 'auto' // push to the right
            }}
          >
            <FaFileAlt size={12} />
            <span>Draft</span>
            {includeDraft && <FaCheck className="net-worth-chip__check" />}
          </button>
        )}
      </div>

      {/* Currency List */}
      <div className="net-worth-currency-list">
        {data.map((item) => {
          const netWorth = computeNetWorth(item);
          const isNegative = netWorth < 0;

          return (
            <div key={item.currency} className="net-worth-currency-section">
              {/* Currency Label removed as it's redundant with formatCurrencyValue prefix */}

              {/* Main Amount */}
              <div className={`net-worth-amount ${isNegative ? 'net-worth-amount--negative' : ''}`}>
                {formatCurrencyValue(netWorth, item.currency)}
              </div>

              {/* Breakdown */}
              <div className="net-worth-breakdown">
                {/* Saldo Akun - always visible */}
                <div className="net-worth-breakdown-line">
                  <span className="net-worth-breakdown-label">Saldo Akun</span>
                  <span className="net-worth-breakdown-value">
                    {formatCurrencyValue(item.accountBalance, item.currency)}
                  </span>
                </div>

                {/* Piutang */}
                <div className={`net-worth-breakdown-line ${!toggle.credit ? 'net-worth-breakdown-line--muted' : ''}`}>
                  <span className="net-worth-breakdown-label">+ Piutang</span>
                  <span className={`net-worth-breakdown-value ${toggle.credit ? 'net-worth-breakdown-value--credit' : ''}`}>
                    {formatCurrencyValue(item.totalCredit, item.currency)}
                  </span>
                </div>

                {/* Hutang */}
                <div className={`net-worth-breakdown-line ${!toggle.debt ? 'net-worth-breakdown-line--muted' : ''}`}>
                  <span className="net-worth-breakdown-label">− Hutang</span>
                  <span className={`net-worth-breakdown-value ${toggle.debt ? 'net-worth-breakdown-value--debt' : ''}`}>
                    {formatCurrencyValue(item.totalDebt, item.currency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
