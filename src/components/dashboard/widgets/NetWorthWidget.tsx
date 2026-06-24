'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaWallet, FaHandHoldingUsd, FaMoneyBillWave, FaFileAlt } from 'react-icons/fa';
import './NetWorthWidget.css';

const STORAGE_KEY = 'net-worth-toggle-state';

type ToggleState = {
  credit: boolean;
  debt: boolean;
};

const DEFAULT_TOGGLE: ToggleState = {
  credit: true,
  debt: true,
};

function loadToggleState(): ToggleState {
  if (typeof window === 'undefined') return DEFAULT_TOGGLE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ToggleState>;
      return {
        credit: typeof parsed.credit === 'boolean' ? parsed.credit : true,
        debt: typeof parsed.debt === 'boolean' ? parsed.debt : true,
      };
    }
  } catch {
    // Ignore malformed storage and fall back to defaults.
  }

  return DEFAULT_TOGGLE;
}

function saveToggleState(state: ToggleState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures.
  }
}

export interface NetWorthWidgetProps {
  data: number;
  accountBalance: number;
  totalCredit: number;
  totalDebt: number;
  isLoading: boolean;
  formatCurrencyValue: (value: number) => string;
  compact?: boolean;
  includeDraft?: boolean;
  onToggleDraft?: (val: boolean) => void;
}

export const NetWorthWidget: React.FC<NetWorthWidgetProps> = ({
  data,
  accountBalance,
  totalCredit,
  totalDebt,
  isLoading,
  formatCurrencyValue,
  compact = false,
  includeDraft,
  onToggleDraft,
}) => {
  const [toggle, setToggle] = useState<ToggleState>(DEFAULT_TOGGLE);

  useEffect(() => {
    setToggle(loadToggleState());
  }, []);

  const handleToggle = useCallback((key: 'credit' | 'debt') => {
    setToggle((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };
      saveToggleState(next);
      return next;
    });
  }, []);

  const visibleNetWorth = accountBalance + (toggle.credit ? totalCredit : 0) - (toggle.debt ? totalDebt : 0);
  const isNegative = visibleNetWorth < 0;

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

  if (data === 0 && accountBalance === 0 && totalCredit === 0 && totalDebt === 0) {
    return <div className="text-center py-4 text-muted">No account data available</div>;
  }

  return (
    <div className={`net-worth-widget ${compact ? 'net-worth-widget--compact' : ''}`}>
      <div className="net-worth-chips">
        <div className="net-worth-chip net-worth-chip--locked" title="Saldo selalu aktif">
          <FaWallet size={12} />
          <span>Saldo</span>
          <FaCheck className="net-worth-chip__check" />
        </div>

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
              marginLeft: 'auto',
            }}
          >
            <FaFileAlt size={12} />
            <span>Draft</span>
            {includeDraft && <FaCheck className="net-worth-chip__check" />}
          </button>
        )}
      </div>

      <div className="net-worth-summary-list">
        <div className="net-worth-summary-section">
          <div className={`net-worth-amount ${isNegative ? 'net-worth-amount--negative' : ''}`}>
            {formatCurrencyValue(visibleNetWorth)}
          </div>

          <div className="net-worth-breakdown">
            <div className="net-worth-breakdown-line">
              <span className="net-worth-breakdown-label">Saldo Akun</span>
              <span className="net-worth-breakdown-value">{formatCurrencyValue(accountBalance)}</span>
            </div>

            <div className={`net-worth-breakdown-line ${!toggle.credit ? 'net-worth-breakdown-line--muted' : ''}`}>
              <span className="net-worth-breakdown-label">+ Piutang</span>
              <span className={`net-worth-breakdown-value ${toggle.credit ? 'net-worth-breakdown-value--credit' : ''}`}>
                {formatCurrencyValue(totalCredit)}
              </span>
            </div>

            <div className={`net-worth-breakdown-line ${!toggle.debt ? 'net-worth-breakdown-line--muted' : ''}`}>
              <span className="net-worth-breakdown-label">− Hutang</span>
              <span className={`net-worth-breakdown-value ${toggle.debt ? 'net-worth-breakdown-value--debt' : ''}`}>
                {formatCurrencyValue(totalDebt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
