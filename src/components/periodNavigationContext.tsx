import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
  useContext,
  type ReactNode,
} from 'react';
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

export type PeriodType = 'month' | 'year' | 'week' | 'custom';

export interface PeriodRange {
  start: string;
  end: string;
}

export interface ActivePeriodMeta {
  type: PeriodType;
  year?: number;
  month?: number;
}

export interface PeriodNavigationState {
  activePeriod: ActivePeriodMeta;
  periodLabel: string;
  dateRange: PeriodRange;
  customRangeDraft: PeriodRange;
}

export interface PeriodNavigationMeta {
  canShiftPeriod: boolean;
}

export interface PeriodNavigationActions {
  handleSelectPreset: (presetKey: string) => void;
  handleSelectMonth: (year: number, month: number) => void;
  handleSelectYear: (year: number) => void;
  handleCustomDraftChange: (range: PeriodRange) => void;
  handleCustomApply: (range?: PeriodRange) => void;
  handleQuickSelect: (range: PeriodRange, label: string, meta?: ActivePeriodMeta) => void;
  shiftPeriod?: (offset: number) => void;
}

export interface PeriodNavigationContextValue {
  state: PeriodNavigationState;
  meta: PeriodNavigationMeta;
  actions: PeriodNavigationActions;
}

interface PeriodNavigationProviderProps {
  initialDate?: Date;
  children: ReactNode;
}

interface InitialPeriod {
  year: number;
  month: number;
  range: PeriodRange;
}

const buildInitialPeriod = (initialDate?: Date): InitialPeriod => {
  const reference =
    initialDate instanceof Date && !Number.isNaN(initialDate.valueOf()) ? initialDate : new Date();
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return {
    year,
    month,
    range: getMonthRange(year, month),
  };
};

export const PeriodNavigationContext =
  createContext<PeriodNavigationContextValue | null>(null);

export const PeriodNavigationProvider: React.FC<PeriodNavigationProviderProps> = ({
  initialDate,
  children,
}) => {
  const initialPeriod = useMemo(() => buildInitialPeriod(initialDate), [initialDate]);
  const [activePeriod, setActivePeriod] = useState<ActivePeriodMeta>({
    type: 'month',
    year: initialPeriod.year,
    month: initialPeriod.month,
  });
  const [periodLabel, setPeriodLabel] = useState<string>('This month');
  const [dateRange, setDateRange] = useState<PeriodRange>({ ...initialPeriod.range });
  const [customRangeDraft, setCustomRangeDraft] = useState<PeriodRange>({
    ...initialPeriod.range,
  });

  const applyRange = useCallback(
    (range: PeriodRange, label: string, meta: ActivePeriodMeta = { type: 'custom' }) => {
      const normalized: PeriodRange = {
        start: range.start || '',
        end: range.end || '',
      };
      setDateRange(normalized);
      setPeriodLabel(label);
      setActivePeriod((previous) => ({
        type: meta.type,
        year: meta.year ?? previous.year ?? initialPeriod.year,
        month: meta.month ?? previous.month ?? initialPeriod.month,
      }));
      setCustomRangeDraft(normalized);
    },
    [initialPeriod.month, initialPeriod.year]
  );

  const handleSelectPreset = useCallback(
    (presetKey: string) => {
      const preset = getPresetRange(presetKey);
      applyRange(
        preset.range,
        preset.label,
        {
          type: preset.meta?.type as PeriodType ?? 'custom',
          year: preset.meta?.year,
          month: preset.meta?.month,
        }
      );
    },
    [applyRange]
  );

  const handleSelectMonth = useCallback(
    (year: number, month: number) => {
      const range = getMonthRange(year, month);
      applyRange(range, formatMonthLabel(year, month), { type: 'month', year, month });
    },
    [applyRange]
  );

  const handleSelectYear = useCallback(
    (year: number) => {
      const range = getYearRange(year);
      applyRange(range, `Year ${year}`, { type: 'year', year });
    },
    [applyRange]
  );

  const handleCustomDraftChange = useCallback((range: PeriodRange) => {
    setCustomRangeDraft({
      start: range?.start ?? '',
      end: range?.end ?? '',
    });
  }, []);

  const handleCustomApply = useCallback(
    (range?: PeriodRange) => {
      const source = range ?? customRangeDraft;
      const normalized: PeriodRange = {
        start: source?.start ?? '',
        end: source?.end ?? '',
      };
      applyRange(normalized, formatCustomRangeLabel(normalized), { type: 'custom' });
    },
    [applyRange, customRangeDraft]
  );

  const handleQuickSelect = useCallback(
    (range: PeriodRange, label: string, meta: ActivePeriodMeta = { type: 'custom' }) => {
      applyRange(range, label, meta);
    },
    [applyRange]
  );

  const shiftPeriod = useCallback(
    (offset: number) => {
      if (!offset) {
        return;
      }
      if (
        activePeriod.type === 'month' &&
        typeof activePeriod.month === 'number' &&
        typeof activePeriod.year === 'number'
      ) {
        const date = new Date(activePeriod.year, activePeriod.month + offset, 1);
        handleSelectMonth(date.getFullYear(), date.getMonth());
        return;
      }
      if (activePeriod.type === 'year' && typeof activePeriod.year === 'number') {
        handleSelectYear(activePeriod.year + offset);
        return;
      }
      if (activePeriod.type === 'week' && dateRange.start && dateRange.end) {
        const startDate = parseISODate(dateRange.start);
        const endDate = parseISODate(dateRange.end);
        if (!startDate || !endDate) {
          return;
        }
        startDate.setDate(startDate.getDate() + offset * 7);
        endDate.setDate(endDate.getDate() + offset * 7);
        applyRange(
          {
            start: toISODate(startDate),
            end: toISODate(endDate),
          },
          formatWeekLabel(startDate, endDate),
          {
            type: 'week',
            year: startDate.getFullYear(),
            month: startDate.getMonth(),
          }
        );
        return;
      }
      if (activePeriod.type === 'custom' && dateRange.start && dateRange.end) {
        const startDate = parseISODate(dateRange.start);
        const endDate = parseISODate(dateRange.end);
        if (!startDate || !endDate) {
          return;
        }
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const spanInDays =
          Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1);
        startDate.setDate(startDate.getDate() + offset * spanInDays);
        endDate.setDate(endDate.getDate() + offset * spanInDays);
        const shiftedRange: PeriodRange = {
          start: toISODate(startDate),
          end: toISODate(endDate),
        };
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
    ]
  );

  const canShiftPeriod = useMemo(() => {
    if (activePeriod.type === 'month' || activePeriod.type === 'year') {
      return true;
    }
    if (activePeriod.type === 'week' || activePeriod.type === 'custom') {
      return Boolean(parseISODate(dateRange.start) && parseISODate(dateRange.end));
    }
    return false;
  }, [activePeriod, dateRange.end, dateRange.start]);

  const value = useMemo<PeriodNavigationContextValue>(
    () => ({
      state: {
        activePeriod,
        periodLabel,
        dateRange,
        customRangeDraft,
      },
      meta: {
        canShiftPeriod,
      },
      actions: {
        handleSelectPreset,
        handleSelectMonth,
        handleSelectYear,
        handleCustomDraftChange,
        handleCustomApply,
        handleQuickSelect,
        shiftPeriod,
      },
    }),
    [
      activePeriod,
      periodLabel,
      dateRange,
      customRangeDraft,
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

export const usePeriodNavigation = (): PeriodNavigationContextValue => {
  const context = useContext(PeriodNavigationContext);
  if (!context) {
    throw new Error('usePeriodNavigation must be used within a PeriodNavigationProvider');
  }
  return context;
};
