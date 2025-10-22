import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Dropdown, Button, ButtonGroup } from 'react-bootstrap';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
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
import { PeriodNavigationContext } from './periodNavigationContext';

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

export function buildAccountMetadata(stored = {}) {
   // This is a simplified version. You may want to adapt it to your needs.
   const accounts = ['All', 'Checking Account', 'Savings Account', 'Credit Card', 'Cash'];
   const defaultAccountMetadata = {
      'Checking Account': { color: '#0d6efd', icon: 'FaUniversity' },
      'Savings Account': { color: '#198754', icon: 'FaPiggyBank' },
      'Credit Card': { color: '#dc3545', icon: 'FaCreditCard' },
      Cash: { color: '#fd7e14', icon: 'FaMoneyBillWave' },
   };
   const metadata = {};
   accounts.forEach((account) => {
      const storedEntry = stored[account] || {};
      const defaults = defaultAccountMetadata[account] || {};
      metadata[account] = {
         color: storedEntry.color || defaults.color || '#6c757d',
         icon: storedEntry.icon || defaults.icon || null,
      };
   });
   return metadata;
}

const normalizeToWeekStart = (date) => {
   const base = new Date(date);
   const offset = (base.getDay() + 6) % 7;
   base.setHours(0, 0, 0, 0);
   base.setDate(base.getDate() - offset);
   return base;
};

const getWeekEndDate = (startDate) => {
   const endDate = new Date(startDate);
   endDate.setDate(endDate.getDate() + 6);
   return endDate;
};

const PeriodRangeSelector = ({
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

   const resolvedActivePeriod = activePeriod ?? contextState?.activePeriod ?? { type: 'custom' };
   const resolvedCustomRange = customRange ?? contextState?.customRangeDraft ?? { start: '', end: '' };
   const resolvedLabel = label ?? contextState?.periodLabel ?? 'This month';

   const resolvedOnSelectPreset = onSelectPreset ?? contextActions?.handleSelectPreset;
   const resolvedOnSelectMonth = onSelectMonth ?? contextActions?.handleSelectMonth;
   const resolvedOnSelectYear = onSelectYear ?? contextActions?.handleSelectYear;
   const resolvedOnCustomChange = onCustomChange ?? contextActions?.handleCustomDraftChange;
   const resolvedOnApplyCustom = onApplyCustom ?? contextActions?.handleCustomApply;
   const resolvedOnQuickSelect = onQuickSelect ?? contextActions?.handleQuickSelect;

   const [show, setShow] = useState(false);
   const [activeView, setActiveView] = useState('custom');
   const initialDateSource = resolvedCustomRange.start ? parseISODate(resolvedCustomRange.start) : null;
   const initialDate = initialDateSource || new Date();
   const [visibleYear, setVisibleYear] = useState(initialDate.getFullYear());
   const [visibleMonth, setVisibleMonth] = useState(initialDate.getMonth());
   const [visibleWeekMonth, setVisibleWeekMonth] = useState(() => ({
      year: initialDate.getFullYear(),
      month: initialDate.getMonth(),
   }));
   const currentYear = new Date().getFullYear();
   const [yearRangeStart, setYearRangeStart] = useState(currentYear - 4);
   const [yearRangeEnd, setYearRangeEnd] = useState(currentYear + 4);

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
      if (resolvedActivePeriod.type === 'month') {
         setVisibleYear(resolvedActivePeriod.year);
         setVisibleMonth(resolvedActivePeriod.month);
      } else if (resolvedActivePeriod.type === 'year') {
         setVisibleYear(resolvedActivePeriod.year);
      }
   }, [resolvedActivePeriod]);

   const changeVisibleMonth = (offset) => {
      let year = visibleYear;
      let month = visibleMonth + offset;
      while (month < 0) {
         month += 12;
         year -= 1;
      }
      while (month > 11) {
         month -= 12;
         year += 1;
      }
      setVisibleYear(year);
      setVisibleMonth(month);
      setVisibleWeekMonth({ year, month });
   };

   const calendarCells = useMemo(() => {
      const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const calendarStart = new Date(visibleYear, visibleMonth, 1 - startOffset);
      const cells = [];
      const startTime = resolvedCustomRange.start ? (parseISODate(resolvedCustomRange.start) || new Date(resolvedCustomRange.start)).getTime() : null;
      const endTime = resolvedCustomRange.end ? (parseISODate(resolvedCustomRange.end) || new Date(resolvedCustomRange.end)).getTime() : null;
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
   }, [visibleYear, visibleMonth, resolvedCustomRange]);

   const applyQuickRange = (range, appliedLabel, meta = { type: 'custom' }) => {
      const normalized = { start: range.start || '', end: range.end || '' };
      if (resolvedOnCustomChange) {
         resolvedOnCustomChange({ ...normalized });
      }
      if (resolvedOnQuickSelect) {
         resolvedOnQuickSelect(normalized, appliedLabel || formatCustomRangeLabel(normalized), meta);
      }
      if (normalized.start) {
         const base = parseISODate(normalized.start) || new Date(normalized.start);
         setVisibleYear(base.getFullYear());
         setVisibleMonth(base.getMonth());
         if (meta?.type === 'week') {
            setVisibleWeekMonth({ year: base.getFullYear(), month: base.getMonth() });
         }
      }
      if (meta?.type === 'custom') {
         setActiveView('custom');
      }
   };

   const handleDayClick = (iso) => {
      const { start, end } = resolvedCustomRange;
      if (!start || (start && end)) {
         if (resolvedOnCustomChange) {
            resolvedOnCustomChange({ start: iso, end: '' });
         }
         return;
      }
      const currentDate = parseISODate(iso) || new Date(iso);
      const startDate = parseISODate(start) || new Date(start);
      if (currentDate < startDate) {
         const updated = { start: iso, end: start };
         if (resolvedOnCustomChange) {
            resolvedOnCustomChange(updated);
         }
         if (resolvedOnApplyCustom) {
            resolvedOnApplyCustom(updated);
         }
      } else {
         const updated = { start, end: iso };
         if (resolvedOnCustomChange) {
            resolvedOnCustomChange(updated);
         }
         if (resolvedOnApplyCustom) {
            resolvedOnApplyCustom(updated);
         }
      }
   };

   const weekOptions = useMemo(() => {
      const options = [];
      const { year, month } = visibleWeekMonth;
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);
      let cursor = normalizeToWeekStart(firstOfMonth);
      while (cursor <= lastOfMonth) {
         const weekStart = new Date(cursor);
         const weekEnd = getWeekEndDate(weekStart);
         options.push({
            startIso: toISODate(weekStart),
            endIso: toISODate(weekEnd),
            label: formatWeekLabel(weekStart, weekEnd),
         });
         cursor.setDate(cursor.getDate() + 7);
      }
      return options;
   }, [visibleWeekMonth]);

   const quickButtons = [
      { label: 'This week', result: () => ({ range: getWeekRange(), label: 'This week', meta: { type: 'week' } }) },
      { label: 'This month', presetKey: 'thisMonth', result: () => getPresetRange('thisMonth') },
      { label: 'This year', presetKey: 'thisYear', result: () => getPresetRange('thisYear') },
      { label: 'Today', result: () => ({ range: getTodayRange(), label: 'Today', meta: { type: 'custom' } }) },
      { label: '7 days', result: () => ({ range: getRollingDaysRange(7), label: 'Last 7 days', meta: { type: 'custom' } }) },
      { label: '30 days', result: () => ({ range: getRollingDaysRange(30), label: 'Last 30 days', meta: { type: 'custom' } }) },
      { label: '90 days', result: () => ({ range: getRollingDaysRange(90), label: 'Last 90 days', meta: { type: 'custom' } }) },
      { label: '12 months', result: () => ({ range: getRollingMonthsRange(12), label: 'Last 12 months', meta: { type: 'custom' } }) },
      { label: 'All', result: () => ({ range: { start: '', end: '' }, label: 'All time', meta: { type: 'custom' } }) },
   ];

   const handleQuickButtonClick = (button) => {
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
      if (button.label === 'This week') {
         const today = new Date();
         setVisibleWeekMonth({ year: today.getFullYear(), month: today.getMonth() });
         setActiveView('weeks');
      }
      applyQuickRange(outcome.range, outcome.label, outcome.meta);
   };

   const renderDayButton = (cell) => {
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
      const style = {
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
            onClick={() => handleDayClick(cell.iso)}
         >
            {cell.day}
         </button>
      );
   };

   const handleMonthClick = (monthIndex) => {
      if (resolvedOnSelectMonth) {
         resolvedOnSelectMonth(visibleYear, monthIndex);
      }
   };

   const handleYearClick = (year) => {
      if (resolvedOnSelectYear) {
         resolvedOnSelectYear(year);
      }
   };

   const handleWeekClick = (option) => {
      applyQuickRange({ start: option.startIso, end: option.endIso }, option.label, { type: 'week' });
      const selectedStart = parseISODate(option.startIso) || new Date(option.startIso);
      setVisibleWeekMonth({ year: selectedStart.getFullYear(), month: selectedStart.getMonth() });
      setActiveView('weeks');
   };

   const shiftWeekMonth = (direction) => {
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
   };

   return (
      <Dropdown show={show} onToggle={(nextShow) => setShow(nextShow)} align="end">
         <Dropdown.Toggle variant="outline-secondary" className="d-flex align-items-center gap-2">
            <FaCalendarAlt />
            <span className='period-range-selector__year-label'>{resolvedLabel}</span>
         </Dropdown.Toggle>
         <Dropdown.Menu className="p-3" style={{ minWidth: '320px' }}>
            <ButtonGroup className="w-100 mb-3">
               <Button
                  variant={activeView === 'custom' ? 'success' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setActiveView('custom')}
               >
                  Custom range
               </Button>
               <Button
                  variant={activeView === 'weeks' ? 'success' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setActiveView('weeks')}
               >
                  Weeks
               </Button>
               <Button
                  variant={activeView === 'months' ? 'success' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setActiveView('months')}
               >
                  Months
               </Button>
               <Button
                  variant={activeView === 'years' ? 'success' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setActiveView('years')}
               >
                  Years
               </Button>
            </ButtonGroup>
            {activeView === 'custom' && (
               <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                     <Button variant="link" className="text-secondary p-0" onClick={() => changeVisibleMonth(-1)}>
                        <FaChevronLeft />
                     </Button>
                     <span className="fw-semibold">{formatMonthLabel(visibleYear, visibleMonth)}</span>
                     <Button variant="link" className="text-secondary p-0" onClick={() => changeVisibleMonth(1)}>
                        <FaChevronRight />
                     </Button>
                  </div>
                  <div
                     className="d-grid text-center mb-2"
                     style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.25rem' }}
                  >
                     {WEEKDAY_LABELS.map((weekday) => (
                        <span key={weekday} className="small fw-semibold text-uppercase text-muted">
                           {weekday}
                        </span>
                     ))}
                     {calendarCells.map((cell) => renderDayButton(cell))}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                     {quickButtons.map((button) => (
                        <Button
                           key={button.label}
                           size="sm"
                           variant="outline-secondary"
                           onClick={() => handleQuickButtonClick(button)}
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
                     <Button variant="link" className="text-secondary p-0" onClick={() => shiftWeekMonth(-1)}>
                        <FaChevronLeft />
                     </Button>
                     <span className="fw-semibold">{formatMonthLabel(visibleWeekMonth.year, visibleWeekMonth.month)}</span>
                     <Button variant="link" className="text-secondary p-0" onClick={() => shiftWeekMonth(1)}>
                        <FaChevronRight />
                     </Button>
                  </div>
                  <div className="d-grid gap-2">
                     {weekOptions.map((option) => (
                        <Button
                           key={option.startIso}
                           variant={option.startIso === (resolvedCustomRange?.start || '') && option.endIso === (resolvedCustomRange?.end || '') ? 'success' : 'outline-secondary'}
                           size="sm"
                           onClick={() => handleWeekClick(option)}
                        >
                           {option.label}
                        </Button>
                     ))}
                  </div>
               </>
            )}
            {activeView === 'months' && (
               <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                     <Button variant="link" className="text-secondary p-0" onClick={() => setVisibleYear((year) => year - 1)}>
                        <FaChevronLeft />
                     </Button>
                     <span className="fw-semibold">{visibleYear}</span>
                     <Button variant="link" className="text-secondary p-0" onClick={() => setVisibleYear((year) => year + 1)}>
                        <FaChevronRight />
                     </Button>
                  </div>
                  <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                     {MONTH_NAMES.map((monthName, index) => {
                        const isSelected =
                           resolvedActivePeriod.type === 'month' && resolvedActivePeriod.year === visibleYear && resolvedActivePeriod.month === index;
                        return (
                           <Button
                              key={monthName}
                              variant={isSelected ? 'success' : 'outline-secondary'}
                              size="sm"
                              onClick={() => handleMonthClick(index)}
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
                           setVisibleYear((year) => year - 9);
                           setYearRangeStart((start) => start - 9);
                           setYearRangeEnd((end) => end - 9);
                        }}
                     >
                        <FaChevronLeft />
                     </Button>
                     <span className="fw-semibold">{`${yearRangeStart} - ${yearRangeEnd}`}</span>
                     <Button
                        variant="link"
                        className="text-secondary p-0"
                        onClick={() => {
                           setVisibleYear((year) => year + 9);
                           setYearRangeStart((start) => start + 9);
                           setYearRangeEnd((end) => end + 9);
                        }}
                     >
                        <FaChevronRight />
                     </Button>
                  </div>
                  <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                     {Array.from({ length: 9 }, (_, index) => yearRangeStart + index).map((year, index) => {
                        const isSelected = resolvedActivePeriod.type === 'year' && resolvedActivePeriod.year === year;
                        return (
                           <Button
                              key={year}
                              variant={isSelected ? 'success' : 'outline-secondary'}
                              size="sm"
                              onClick={() => handleYearClick(year)}
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
