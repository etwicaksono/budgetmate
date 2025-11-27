import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dropdown, Button, ButtonGroup } from 'react-bootstrap';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { IconBaseProps, IconType } from 'react-icons';
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  toISODate,
  parseISODate,
  getWeekRange,
  getTodayRange,
  getRollingDaysRange,
  getRollingMonthsRange,
  formatMonthLabel,
  formatWeekLabel,
  formatCustomRangeLabel,
  getPresetRange,
} from './periodRangeUtils';
import {
  PeriodNavigationContext,
  type PeriodRange,
  type ActivePeriodMeta,
} from './periodNavigationContext';

export {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  toISODate,
  parseISODate,
  getMonthRange,
  getYearRange,
  getWeekRange,
  getTodayRange,
  getRollingDaysRange,
  getRollingMonthsRange,
  formatMonthLabel,
  formatWeekLabel,
  formatCustomRangeLabel,
  getPresetRange,
} from './periodRangeUtils';

export interface AccountMetadataEntry {
  color: string;
  icon: string | null;
}

export type AccountMetadata = Record<string, AccountMetadataEntry>;

export function buildAccountMetadata(stored: Record<string, unknown> = {}): AccountMetadata {
  const accounts = ['All', 'Checking Account-2', 'Savings Account', 'Credit Card', 'Cash'] as const;
  const defaultAccountMetadata: Record<
    (typeof accounts)[number],
    { color: string; icon: string | null }
  > = {
    'Checking Account-2': { color: '#0d6efd', icon: 'FaUniversity' },
    'Savings Account': { color: '#198754', icon: 'FaPiggyBank' },
    'Credit Card': { color: '#dc3545', icon: 'FaCreditCard' },
    Cash: { color: '#fd7e14', icon: 'FaMoneyBillWave' },
    All: { color: '#6c757d', icon: null },
  };

  const metadata: AccountMetadata = {};
  accounts.forEach((account) => {
    const rawEntry = stored[account];
    const storedEntry =
      rawEntry && typeof rawEntry === 'object'
        ? (rawEntry as Partial<AccountMetadataEntry>)
        : {};
    const defaults = defaultAccountMetadata[account];
    metadata[account] = {
      color: storedEntry.color ?? defaults.color,
      icon: storedEntry.icon ?? defaults.icon,
    };
  });

  return metadata;
}

const normalizeToWeekStart = (input: Date | string): Date => {
  const base = input instanceof Date ? new Date(input) : new Date(input);
  const offset = (base.getDay() + 6) % 7;
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - offset);
  return base;
};

const getWeekEndDate = (startDate: Date): Date => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return endDate;
};

type ViewMode = 'custom' | 'weeks' | 'months' | 'years';

type IconRenderable = IconType | React.ComponentType<IconBaseProps>;

interface QuickButtonResult {
  range: PeriodRange;
  label: string;
  meta?: ActivePeriodMeta;
}

interface QuickButton {
  label: string;
  presetKey?: string;
  result: () => QuickButtonResult;
}

interface CalendarCell {
  iso: string;
  day: number;
  isCurrentMonth: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
}

export interface PeriodRangeSelectorProps {
  label?: string;
  activePeriod?: ActivePeriodMeta;
  customRange?: PeriodRange;
  onSelectPreset?: (presetKey: string) => void;
  onSelectMonth?: (year: number, month: number) => void;
  onSelectYear?: (year: number) => void;
  onCustomChange?: (range: PeriodRange) => void;
  onApplyCustom?: (range: PeriodRange) => void;
  onQuickSelect?: (range: PeriodRange, label: string, meta?: ActivePeriodMeta) => void;
}

const renderIcon = (
  IconComponent: IconRenderable,
  props: IconBaseProps = {}
): React.ReactNode => React.createElement(IconComponent as React.ComponentType<IconBaseProps>, props);

const VIEW_TABS: Array<{ key: ViewMode; label: string }> = [
  { key: 'custom', label: 'Custom range' },
  { key: 'weeks', label: 'Weeks' },
  { key: 'months', label: 'Months' },
  { key: 'years', label: 'Years' },
];

const PeriodRangeSelector: React.FC<PeriodRangeSelectorProps> = ({
  label,
  activePeriod,
  customRange,
  onSelectPreset,
  onSelectMonth,
  onSelectYear,
  onCustomChange,
  onApplyCustom,
  onQuickSelect,
}) => {
  const context = useContext(PeriodNavigationContext);

  const contextState = context?.state;
  const contextActions = context?.actions;

  const resolvedActivePeriod: ActivePeriodMeta = useMemo(
    () => activePeriod ?? contextState?.activePeriod ?? { type: 'custom' },
    [activePeriod, contextState?.activePeriod]
  );
  const resolvedCustomRange = useMemo(
    () => customRange ?? contextState?.customRangeDraft ?? { start: '', end: '' },
    [customRange, contextState?.customRangeDraft]
  );
  const resolvedLabel = label ?? contextState?.periodLabel ?? 'This month';

  const resolvedOnSelectPreset = onSelectPreset ?? contextActions?.handleSelectPreset;
  const resolvedOnSelectMonth = onSelectMonth ?? contextActions?.handleSelectMonth;
  const resolvedOnSelectYear = onSelectYear ?? contextActions?.handleSelectYear;
  const resolvedOnCustomChange = onCustomChange ?? contextActions?.handleCustomDraftChange;
  const resolvedOnApplyCustom = onApplyCustom ?? contextActions?.handleCustomApply;
  const resolvedOnQuickSelect = onQuickSelect ?? contextActions?.handleQuickSelect;

  const [show, setShow] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ViewMode>('custom');

  const initialDateSource = resolvedCustomRange.start
    ? parseISODate(resolvedCustomRange.start)
    : null;
  const initialDate = initialDateSource ?? new Date();

  const [visibleYear, setVisibleYear] = useState<number>(initialDate.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState<number>(initialDate.getMonth());
  const [visibleWeekMonth, setVisibleWeekMonth] = useState<{ year: number; month: number }>(() => ({
    year: initialDate.getFullYear(),
    month: initialDate.getMonth(),
  }));
  const currentYear = new Date().getFullYear();
  const [yearRangeStart, setYearRangeStart] = useState<number>(currentYear - 5);
  const [yearRangeEnd, setYearRangeEnd] = useState<number>(currentYear + 6);
  const [hoveredWeekStart, setHoveredWeekStart] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedCustomRange.start) {
      const startDate = parseISODate(resolvedCustomRange.start);
      if (startDate) {
        setVisibleYear(startDate.getFullYear());
        setVisibleMonth(startDate.getMonth());
        setVisibleWeekMonth({ year: startDate.getFullYear(), month: startDate.getMonth() });
      }
    }
  }, [resolvedCustomRange.start]);

  useEffect(() => {
    if (resolvedActivePeriod.type === 'month' && typeof resolvedActivePeriod.month === 'number') {
      setVisibleYear(resolvedActivePeriod.year ?? visibleYear);
      setVisibleMonth(resolvedActivePeriod.month);
    } else if (resolvedActivePeriod.type === 'year' && resolvedActivePeriod.year) {
      setVisibleYear(resolvedActivePeriod.year);
    }
  }, [resolvedActivePeriod, visibleYear]);

  const quickButtons = useMemo<QuickButton[]>(
    () => [
      {
        label: 'This week',
        result: () => ({ range: getWeekRange(), label: 'This week', meta: { type: 'week' } }),
      },
      {
        label: 'This month',
        presetKey: 'thisMonth',
        result: () => getPresetRange('thisMonth'),
      },
      {
        label: 'This year',
        presetKey: 'thisYear',
        result: () => getPresetRange('thisYear'),
      },
      {
        label: 'Today',
        result: () => ({ range: getTodayRange(), label: 'Today', meta: { type: 'custom' } }),
      },
      {
        label: '7 days',
        result: () => ({
          range: getRollingDaysRange(7),
          label: 'Last 7 days',
          meta: { type: 'custom' },
        }),
      },
      {
        label: '30 days',
        result: () => ({
          range: getRollingDaysRange(30),
          label: 'Last 30 days',
          meta: { type: 'custom' },
        }),
      },
      {
        label: '90 days',
        result: () => ({
          range: getRollingDaysRange(90),
          label: 'Last 90 days',
          meta: { type: 'custom' },
        }),
      },
      {
        label: '12 months',
        result: () => ({
          range: getRollingMonthsRange(12),
          label: 'Last 12 months',
          meta: { type: 'custom' },
        }),
      },
      {
        label: 'All',
        result: () => ({
          range: { start: '', end: '' },
          label: 'All time',
          meta: { type: 'custom' },
        }),
      },
    ],
    []
  );

  const applyQuickRange = useCallback(
    (range: PeriodRange, appliedLabel: string, meta: ActivePeriodMeta = { type: 'custom' }) => {
      const normalized: PeriodRange = { start: range.start, end: range.end };
      resolvedOnCustomChange?.({ ...normalized });
      const quickSelectLabel = appliedLabel.length > 0 ? appliedLabel : formatCustomRangeLabel(normalized);
      resolvedOnQuickSelect?.(normalized, quickSelectLabel, meta);
      if (normalized.start) {
        const base = parseISODate(normalized.start) ?? new Date(normalized.start);
        setVisibleYear(base.getFullYear());
        setVisibleMonth(base.getMonth());
        if (meta.type === 'week') {
          setVisibleWeekMonth({ year: base.getFullYear(), month: base.getMonth() });
        }
      }
      if (meta.type === 'custom') {
        setActiveView('custom');
      }
    },
    [resolvedOnCustomChange, resolvedOnQuickSelect]
  );

  const handleQuickButtonClick = useCallback(
    (button: QuickButton) => {
      if (button.presetKey && resolvedOnSelectPreset) {
        resolvedOnSelectPreset(button.presetKey);
        if (button.presetKey === 'thisMonth' || button.presetKey === 'lastMonth') {
          setActiveView('months');
        } else if (button.presetKey === 'thisYear' || button.presetKey === 'lastYear') {
          setActiveView('years');
        }
        return;
      }
      const outcome = button.result();
      applyQuickRange(outcome.range, outcome.label, outcome.meta ?? { type: 'custom' });
    },
    [applyQuickRange, resolvedOnSelectPreset]
  );

  const handleDayClick = useCallback(
    (iso: string) => {
      const { start, end } = resolvedCustomRange;
      if (!start || (start && end)) {
        resolvedOnCustomChange?.({ start: iso, end: '' });
        return;
      }
      const currentDate = parseISODate(iso) ?? new Date(iso);
      const startDate = parseISODate(start) ?? new Date(start);
      if (currentDate < startDate) {
        const updated: PeriodRange = { start: iso, end: start };
        resolvedOnCustomChange?.(updated);
        resolvedOnApplyCustom?.(updated);
      } else {
        const updated: PeriodRange = { start, end: iso };
        resolvedOnCustomChange?.(updated);
        resolvedOnApplyCustom?.(updated);
      }
    },
    [resolvedCustomRange, resolvedOnApplyCustom, resolvedOnCustomChange]
  );

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const calendarStart = new Date(visibleYear, visibleMonth, 1 - startOffset);
    const cells: CalendarCell[] = [];
    const startTime = resolvedCustomRange.start
      ? (parseISODate(resolvedCustomRange.start) ?? new Date(resolvedCustomRange.start)).getTime()
      : null;
    const endTime = resolvedCustomRange.end
      ? (parseISODate(resolvedCustomRange.end) ?? new Date(resolvedCustomRange.end)).getTime()
      : null;
    for (let index = 0; index < 42; index += 1) {
      const current = new Date(calendarStart);
      current.setDate(calendarStart.getDate() + index);
      const iso = toISODate(current);
      const currentTime = current.getTime();
      const isStart = !!startTime && currentTime === startTime;
      const isEnd = !!endTime && currentTime === endTime;
      const inRange =
        !!startTime &&
        !!endTime &&
        currentTime > Math.min(startTime, endTime) &&
        currentTime < Math.max(startTime, endTime);
      cells.push({
        iso,
        day: current.getDate(),
        isCurrentMonth: current.getMonth() === visibleMonth,
        isStart,
        isEnd,
        inRange,
      });
    }
    return cells;
  }, [resolvedCustomRange.end, resolvedCustomRange.start, visibleMonth, visibleYear]);

  const renderDayButton = useCallback(
    (cell: CalendarCell) => {
      const isActive = cell.isStart || cell.isEnd;
      const classes = ['btn', 'btn-sm', 'border-0', 'rounded-circle'];
      if (isActive) {
        classes.push('btn-success', 'text-white');
      } else {
        classes.push('btn-outline-secondary');
        if (!cell.isCurrentMonth) {
          classes.push('text-muted');
        }
      }
      const style: React.CSSProperties = {
        width: '2.25rem',
        height: '2.25rem',
        backgroundColor: !isActive && cell.inRange ? 'rgba(25,135,84,0.15)' : undefined,
      };
      return (
        <button
          key={cell.iso}
          type="button"
          className={classes.join(' ')}
          style={style}
          onClick={() => {
            handleDayClick(cell.iso);
          }}
        >
          {cell.day}
        </button>
      );
    },
    [handleDayClick]
  );

  // Check if current selection is a valid week (Mon-Sun, exactly 7 days)
  const isValidWeekSelection = useMemo(() => {
    if (!resolvedCustomRange.start || !resolvedCustomRange.end) return false;
    
    const startDate = parseISODate(resolvedCustomRange.start) ?? new Date(resolvedCustomRange.start);
    const endDate = parseISODate(resolvedCustomRange.end) ?? new Date(resolvedCustomRange.end);
    
    // Check if start is Monday (day 1 in JS after adjustment)
    const startDay = startDate.getDay();
    const isStartMonday = startDay === 1;
    
    // Check if end is Sunday (day 0 in JS)
    const endDay = endDate.getDay();
    const isEndSunday = endDay === 0;
    
    // Check if exactly 6 days apart (Mon to Sun = 6 days difference)
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isSevenDays = daysDiff === 6;
    
    return isStartMonday && isEndSunday && isSevenDays;
  }, [resolvedCustomRange.start, resolvedCustomRange.end]);

  // Week calendar cells for the weeks picker view
  const weekCalendarCells = useMemo<CalendarCell[]>(() => {
    const { year, month } = visibleWeekMonth;
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const calendarStart = new Date(year, month, 1 - startOffset);
    const cells: CalendarCell[] = [];
    
    // Only use selection if it's a valid week
    const selectedStartTime = isValidWeekSelection && resolvedCustomRange.start
      ? (parseISODate(resolvedCustomRange.start) ?? new Date(resolvedCustomRange.start)).getTime()
      : null;
    const selectedEndTime = isValidWeekSelection && resolvedCustomRange.end
      ? (parseISODate(resolvedCustomRange.end) ?? new Date(resolvedCustomRange.end)).getTime()
      : null;
    
    for (let index = 0; index < 42; index += 1) {
      const current = new Date(calendarStart);
      current.setDate(calendarStart.getDate() + index);
      const iso = toISODate(current);
      const currentTime = current.getTime();
      const isStart = !!selectedStartTime && currentTime === selectedStartTime;
      const isEnd = !!selectedEndTime && currentTime === selectedEndTime;
      const inRange =
        !!selectedStartTime &&
        !!selectedEndTime &&
        currentTime >= selectedStartTime &&
        currentTime <= selectedEndTime;
      cells.push({
        iso,
        day: current.getDate(),
        isCurrentMonth: current.getMonth() === month,
        isStart,
        isEnd,
        inRange,
      });
    }
    return cells;
  }, [isValidWeekSelection, resolvedCustomRange.end, resolvedCustomRange.start, visibleWeekMonth]);

  const handleWeekDayClick = useCallback(
    (iso: string) => {
      const clickedDate = parseISODate(iso) ?? new Date(iso);
      const weekStart = normalizeToWeekStart(clickedDate);
      const weekEnd = getWeekEndDate(weekStart);
      const startIso = toISODate(weekStart);
      const endIso = toISODate(weekEnd);
      const label = formatWeekLabel(weekStart, weekEnd);
      
      applyQuickRange({ start: startIso, end: endIso }, label, { type: 'week' });
    },
    [applyQuickRange]
  );

  const getWeekStartForDate = useCallback((iso: string): string => {
    const date = parseISODate(iso) ?? new Date(iso);
    const weekStart = normalizeToWeekStart(date);
    return toISODate(weekStart);
  }, []);

  const renderWeekDayButton = useCallback(
    (cell: CalendarCell, index: number) => {
      const weekStartIso = getWeekStartForDate(cell.iso);
      const isHovered = hoveredWeekStart === weekStartIso;
      const isSelected = cell.inRange;
      const isWeekStart = index % 7 === 0;
      const isWeekEnd = index % 7 === 6;
      
      const classes = ['btn', 'btn-sm', 'border-0'];
      
      // Determine background and text styling
      let backgroundColor: string | undefined;
      let textColor: string | undefined;
      
      if (isSelected) {
        backgroundColor = 'rgb(25, 135, 84)';
        textColor = '#fff';
      } else if (isHovered) {
        backgroundColor = 'rgba(25, 135, 84, 0.15)';
      }
      
      if (!cell.isCurrentMonth && !isSelected) {
        textColor = '#adb5bd';
      }
      
      const style: React.CSSProperties = {
        width: '2.25rem',
        height: '2.25rem',
        backgroundColor,
        color: textColor,
        borderRadius: isSelected
          ? isWeekStart
            ? '50% 0 0 50%'
            : isWeekEnd
            ? '0 50% 50% 0'
            : '0'
          : isHovered
          ? isWeekStart
            ? '50% 0 0 50%'
            : isWeekEnd
            ? '0 50% 50% 0'
            : '0'
          : '50%',
        transition: 'background-color 0.15s ease',
      };
      
      return (
        <button
          key={cell.iso}
          type="button"
          className={classes.join(' ')}
          style={style}
          onClick={() => handleWeekDayClick(cell.iso)}
          onMouseEnter={() => setHoveredWeekStart(weekStartIso)}
          onMouseLeave={() => setHoveredWeekStart(null)}
        >
          {cell.day}
        </button>
      );
    },
    [getWeekStartForDate, handleWeekDayClick, hoveredWeekStart]
  );

  const shiftWeekMonth = useCallback((direction: number) => {
    setVisibleWeekMonth((previous) => {
      let year = previous.year;
      let month = previous.month + direction;
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month > 11) {
        month -= 12;
        year += 1;
      }
      return { year, month };
    });
    setActiveView('weeks');
  }, []);

  const handleMonthClick = useCallback(
    (monthIndex: number) => {
      resolvedOnSelectMonth?.(visibleYear, monthIndex);
      setActiveView('months');
    },
    [resolvedOnSelectMonth, visibleYear]
  );

  const handleYearClick = useCallback(
    (year: number) => {
      resolvedOnSelectYear?.(year);
      setVisibleYear(year);
      setActiveView('years');
    },
    [resolvedOnSelectYear]
  );

  const handleCalendarShift = useCallback(
    (offset: number) => {
      const next = new Date(visibleYear, visibleMonth + offset, 1);
      setVisibleYear(next.getFullYear());
      setVisibleMonth(next.getMonth());
    },
    [visibleMonth, visibleYear]
  );

  const handleToggle = useCallback((nextShow: boolean | undefined) => {
    setShow(nextShow ?? false);
  }, []);

  return (
    <Dropdown show={show} onToggle={handleToggle} className="period-range-dropdown">
      <Dropdown.Toggle variant="outline-secondary" className="d-flex align-items-center gap-2 w-100">
        {renderIcon(FaCalendarAlt)}
        <span className="period-range-selector__year-label">{resolvedLabel}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-3 period-range-selector w-100">
        <ButtonGroup className="w-100 mb-3">
          {VIEW_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeView === tab.key ? 'success' : 'outline-secondary'}
              size="sm"
            onClick={() => {
              setActiveView(tab.key);
            }}
            >
              {tab.label}
            </Button>
          ))}
        </ButtonGroup>

        {activeView === 'custom' && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  handleCalendarShift(-1);
                }}
              >
                {renderIcon(FaChevronLeft)}
              </Button>
              <span className="fw-semibold">{formatMonthLabel(visibleYear, visibleMonth)}</span>
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  handleCalendarShift(1);
                }}
              >
                {renderIcon(FaChevronRight)}
              </Button>
            </div>

            <div className="calendar mb-3">
              <div className="d-grid mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {WEEKDAY_LABELS.map((weekday) => (
                  <div key={weekday} className="text-center text-muted small">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                {calendarCells.map((cell) => renderDayButton(cell))}
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {quickButtons.map((button) => (
                <Button
                  key={button.label}
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => {
                    handleQuickButtonClick(button);
                  }}
                >
                  {button.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {activeView === 'weeks' && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  shiftWeekMonth(-1);
                }}
              >
                {renderIcon(FaChevronLeft)}
              </Button>
              <span className="fw-semibold">
                {formatMonthLabel(visibleWeekMonth.year, visibleWeekMonth.month)}
              </span>
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  shiftWeekMonth(1);
                }}
              >
                {renderIcon(FaChevronRight)}
              </Button>
            </div>
            <div className="week-calendar">
              <div className="d-grid mb-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {WEEKDAY_LABELS.map((weekday) => (
                  <div key={weekday} className="text-center text-muted small">
                    {weekday}
                  </div>
                ))}
              </div>
              <div
                className="d-grid"
                style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem 0' }}
                onMouseLeave={() => setHoveredWeekStart(null)}
              >
                {weekCalendarCells.map((cell, index) => renderWeekDayButton(cell, index))}
              </div>
            </div>
          </>
        )}

        {activeView === 'months' && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  setVisibleYear((year) => year - 1);
                }}
              >
                {renderIcon(FaChevronLeft)}
              </Button>
              <span className="fw-semibold">{visibleYear}</span>
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  setVisibleYear((year) => year + 1);
                }}
              >
                {renderIcon(FaChevronRight)}
              </Button>
            </div>
            <div
              className="d-grid"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}
            >
              {MONTH_NAMES.map((monthName, index) => {
                const isSelected =
                  resolvedActivePeriod.type === 'month' &&
                  resolvedActivePeriod.year === visibleYear &&
                  resolvedActivePeriod.month === index;
                return (
                  <Button
                    key={monthName}
                    variant={isSelected ? 'success' : 'outline-secondary'}
                    onClick={() => {
                      handleMonthClick(index);
                    }}
                    style={{ padding: '0.75rem 0.5rem' }}
                  >
                    {monthName}
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {activeView === 'years' && (
          <>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  setVisibleYear((year) => year - 12);
                  setYearRangeStart((start) => start - 12);
                  setYearRangeEnd((end) => end - 12);
                }}
              >
                {renderIcon(FaChevronLeft)}
              </Button>
              <span className="fw-semibold">{`${yearRangeStart.toString()} - ${yearRangeEnd.toString()}`}</span>
              <Button
                variant="link"
                className="text-secondary p-0"
                onClick={() => {
                  setVisibleYear((year) => year + 12);
                  setYearRangeStart((start) => start + 12);
                  setYearRangeEnd((end) => end + 12);
                }}
              >
                {renderIcon(FaChevronRight)}
              </Button>
            </div>
            <div
              className="d-grid"
              style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}
            >
              {Array.from({ length: 12 }, (_, index) => yearRangeStart + index).map((year) => {
                const isSelected =
                  resolvedActivePeriod.type === 'year' && resolvedActivePeriod.year === year;
                return (
                  <Button
                    key={year}
                    variant={isSelected ? 'success' : 'outline-secondary'}
                    onClick={() => {
                      handleYearClick(year);
                    }}
                    style={{ padding: '0.75rem 0.5rem' }}
                  >
                    {year}
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default PeriodRangeSelector;
