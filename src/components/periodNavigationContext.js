import React, { useCallback, useMemo, useState } from 'react';
import {
  getPresetRange,
  getMonthRange,
  getYearRange,
  formatMonthLabel,
  formatCustomRangeLabel,
  formatWeekLabel,
  parseISODate,
  toISODate,
} from './periodRangeUtils';

export const PeriodNavigationContext = React.createContext(null);

const buildInitialPeriod = (initialDate) => {
  const reference = initialDate instanceof Date ? initialDate : new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return {
    year,
    month,
    range: getMonthRange(year, month),
  };
};

export const PeriodNavigationProvider = ({ initialDate, children }) => {
  const initialPeriod = useMemo(() => buildInitialPeriod(initialDate), [initialDate]);
  const [activePeriod, setActivePeriod] = useState({
    type: 'month',
    year: initialPeriod.year,
    month: initialPeriod.month,
  });
  const [periodLabel, setPeriodLabel] = useState('This month');
  const [dateRange, setDateRange] = useState(() => ({ ...initialPeriod.range }));
  const [customRangeDraft, setCustomRangeDraft] = useState(() => ({ ...initialPeriod.range }));

  const applyRange = useCallback(
    (range, label, meta = { type: 'custom' }) => {
      const normalized = {
        start: range.start || '',
        end: range.end || '',
      };
      setDateRange(normalized);
      setPeriodLabel(label);
      setActivePeriod((previous) => ({
        type: meta.type || 'custom',
        year: meta.year ?? previous.year ?? initialPeriod.year,
        month: meta.month ?? previous.month ?? initialPeriod.month,
      }));
      setCustomRangeDraft(normalized);
    },
    [initialPeriod.month, initialPeriod.year]
  );

  const handleSelectPreset = useCallback(
    (presetKey) => {
      const preset = getPresetRange(presetKey);
      applyRange(preset.range, preset.label, preset.meta || { type: 'custom' });
    },
    [applyRange]
  );

  const handleSelectMonth = useCallback(
    (year, month) => {
      const range = getMonthRange(year, month);
      applyRange(range, formatMonthLabel(year, month), { type: 'month', year, month });
    },
    [applyRange]
  );

  const handleSelectYear = useCallback(
    (year) => {
      const range = getYearRange(year);
      applyRange(range, `${year}`, { type: 'year', year });
    },
    [applyRange]
  );

  const handleCustomDraftChange = useCallback((range) => {
    setCustomRangeDraft({ ...(range || { start: '', end: '' }) });
  }, []);

  const handleCustomApply = useCallback(
    (range) => {
      const normalized = { ...(range || { start: '', end: '' }) };
      applyRange(normalized, formatCustomRangeLabel(normalized));
    },
    [applyRange]
  );

  const handleQuickSelect = useCallback(
    (range, quickLabel, meta = { type: 'custom' }) => {
      const normalized = { ...(range || { start: '', end: '' }) };
      applyRange(normalized, quickLabel || formatCustomRangeLabel(normalized), meta);
    },
    [applyRange]
  );

  const shiftPeriod = useCallback(
    (direction) => {
      if (!direction) {
        return;
      }
      if (activePeriod.type === 'month') {
        let year = activePeriod.year ?? initialPeriod.year;
        let month = (activePeriod.month ?? initialPeriod.month) + direction;
        while (month < 0) {
          month += 12;
          year -= 1;
        }
        while (month > 11) {
          month -= 12;
          year += 1;
        }
        handleSelectMonth(year, month);
      } else if (activePeriod.type === 'year') {
        const year = (activePeriod.year ?? initialPeriod.year) + direction;
        handleSelectYear(year);
      } else if (activePeriod.type === 'week') {
        const startDate = parseISODate(dateRange.start);
        const endDate = parseISODate(dateRange.end);
        if (!startDate || !endDate) {
          return;
        }
        startDate.setDate(startDate.getDate() + direction * 7);
        endDate.setDate(endDate.getDate() + direction * 7);
        const shiftedRange = { start: toISODate(startDate), end: toISODate(endDate) };
        applyRange(shiftedRange, formatWeekLabel(startDate, endDate), {
          type: 'week',
          year: startDate.getFullYear(),
          month: startDate.getMonth(),
        });
      } else if (activePeriod.type === 'custom') {
        const startDate = parseISODate(dateRange.start);
        const endDate = parseISODate(dateRange.end);
        if (!startDate || !endDate) {
          return;
        }
        const daySpan = Math.max(1, Math.round((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1);
        startDate.setDate(startDate.getDate() + direction * daySpan);
        endDate.setDate(endDate.getDate() + direction * daySpan);
        const shiftedRange = { start: toISODate(startDate), end: toISODate(endDate) };
        applyRange(shiftedRange, formatCustomRangeLabel(shiftedRange), { type: 'custom' });
      }
    },
    [
      activePeriod,
      applyRange,
      dateRange.end,
      dateRange.start,
      handleSelectMonth,
      handleSelectYear,
      initialPeriod.month,
      initialPeriod.year,
    ]
  );

  const canShiftPeriod = useMemo(() => {
    if (activePeriod.type === 'month' || activePeriod.type === 'year') {
      return true;
    }
    if (activePeriod.type === 'week') {
      return Boolean(parseISODate(dateRange.start) && parseISODate(dateRange.end));
    }
    if (activePeriod.type === 'custom') {
      return Boolean(parseISODate(dateRange.start) && parseISODate(dateRange.end));
    }
    return false;
  }, [activePeriod, dateRange.end, dateRange.start]);

  const value = useMemo(
    () => ({
      state: {
        activePeriod,
        periodLabel,
        dateRange,
        customRangeDraft,
      },
      actions: {
        applyRange,
        handleSelectPreset,
        handleSelectMonth,
        handleSelectYear,
        handleCustomDraftChange,
        handleCustomApply,
        handleQuickSelect,
        shiftPeriod,
        setPeriodLabel,
      },
      meta: {
        canShiftPeriod,
      },
    }),
    [
      activePeriod,
      periodLabel,
      dateRange,
      customRangeDraft,
      applyRange,
      handleSelectPreset,
      handleSelectMonth,
      handleSelectYear,
      handleCustomDraftChange,
      handleCustomApply,
      handleQuickSelect,
      shiftPeriod,
      canShiftPeriod,
    ]
  );

  return (
    <PeriodNavigationContext.Provider value={value}>
      {children}
    </PeriodNavigationContext.Provider>
  );
};

export const usePeriodNavigation = () => {
  const context = React.useContext(PeriodNavigationContext);
  if (!context) {
    throw new Error('usePeriodNavigation must be used within a PeriodNavigationProvider');
  }
  return context;
};
