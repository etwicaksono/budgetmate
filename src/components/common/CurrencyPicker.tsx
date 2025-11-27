'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CURRENCIES, getPopularCurrencies, getAllCurrencies } from '@/config/currencies';
import './CurrencyPicker.css';

interface CurrencyPickerProps {
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
  showPopular?: boolean;
  className?: string;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  value,
  onChange,
  disabled = false,
  showPopular = true,
  className = ''
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const popularCurrencies = useMemo(() => getPopularCurrencies(), []);
  const allCurrencies = useMemo(() => getAllCurrencies(), []);
  
  const filteredCurrencies = useMemo(() => {
    if (!search) return allCurrencies;
    
    const searchLower = search.toLowerCase();
    return allCurrencies.filter(c => 
      c.code.toLowerCase().includes(searchLower) ||
      c.name.toLowerCase().includes(searchLower) ||
      c.symbol.toLowerCase().includes(searchLower)
    );
  }, [search, allCurrencies]);
  
  const selectedCurrency = CURRENCIES[value];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [isOpen]);
  
  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };
  
  if (!selectedCurrency && !CURRENCIES[value]) {
    // Fallback for unknown currency - initialize with first available
    const firstCurrency = allCurrencies[0];
    if (firstCurrency) {
      onChange(firstCurrency.code);
    }
  }
  
  return (
    <div className={`currency-picker ${className}`} ref={dropdownRef}>
      {/* Selected Currency Display */}
      <button
        type="button"
        className="currency-picker__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selectedCurrency && (
          <>
            <span className="currency-picker__flag">{selectedCurrency.countryCode || value.substring(0, 2)}</span>
            <span className="currency-picker__code">{value}</span>
            <span className="currency-picker__symbol">{selectedCurrency.symbol}</span>
          </>
        )}
        {!selectedCurrency && <span className="currency-picker__code">{value}</span>}
        <span className="currency-picker__arrow">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="currency-picker__dropdown">
          {/* Search */}
          <div className="currency-picker__search">
            <input
              type="text"
              placeholder="Search currencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="currency-picker__search-input"
            />
          </div>
          
          {/* Results */}
          <div className="currency-picker__results">
            {/* Popular Currencies */}
            {showPopular && !search && popularCurrencies.length > 0 && (
              <div className="currency-picker__section">
                <div className="currency-picker__section-title">Popular Currencies</div>
                {popularCurrencies.map((currency) => (
                  <button
                    key={currency.code}
                    type="button"
                    className={`currency-picker__item ${currency.code === value ? 'active' : ''}`}
                    onClick={() => handleSelect(currency.code)}
                  >
                    <span className="currency-picker__flag">{currency.countryCode || currency.code.substring(0, 2)}</span>
                    <span className="currency-picker__details">
                      <span className="currency-picker__code-name">
                        <strong>{currency.code}</strong> - {currency.name}
                      </span>
                    </span>
                    <span className="currency-picker__symbol">{currency.symbol}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* All Currencies */}
            <div className="currency-picker__section">
              {!search && <div className="currency-picker__section-title">All Currencies</div>}
              {search && filteredCurrencies.length === 0 && (
                <div className="currency-picker__no-results">
                  No currencies found for "{search}"
                </div>
              )}
              {filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  className={`currency-picker__item ${currency.code === value ? 'active' : ''}`}
                  onClick={() => handleSelect(currency.code)}
                >
                  <span className="currency-picker__flag">{currency.countryCode || currency.code.substring(0, 2)}</span>
                  <span className="currency-picker__details">
                    <span className="currency-picker__code-name">
                      <strong>{currency.code}</strong> - {currency.name}
                    </span>
                  </span>
                  <span className="currency-picker__symbol">{currency.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
