import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dropdown, Button, ButtonGroup } from 'react-bootstrap';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import type { IconBaseProps, IconType } from 'react-icons';
import {
    MONTH_NAMES,
} from './periodRangeUtils';
import {
    PeriodNavigationContext,
    type ActivePeriodMeta,
} from './periodNavigationContext';

type ViewMode = 'months' | 'years';
type IconRenderable = IconType | React.ComponentType<IconBaseProps>;

export interface MonthYearSelectorProps {
    label?: string;
    activePeriod?: ActivePeriodMeta;
    onSelectMonth?: (year: number, month: number) => void;
    onSelectYear?: (year: number) => void;
}

const renderIcon = (
    IconComponent: IconRenderable,
    props: IconBaseProps = {}
): React.ReactNode => React.createElement(IconComponent as React.ComponentType<IconBaseProps>, props);

const VIEW_TABS: Array<{ key: ViewMode; label: string }> = [
    { key: 'months', label: 'Months' },
    { key: 'years', label: 'Years' },
];

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
    label,
    activePeriod,
    onSelectMonth,
    onSelectYear,
}) => {
    const context = useContext(PeriodNavigationContext);
    const contextState = context?.state;
    const contextActions = context?.actions;

    const resolvedActivePeriod: ActivePeriodMeta = useMemo(
        () => activePeriod ?? contextState?.activePeriod ?? { type: 'month' },
        [activePeriod, contextState?.activePeriod]
    );

    const resolvedLabel = label ?? contextState?.periodLabel ?? 'This month';
    const resolvedOnSelectMonth = onSelectMonth ?? contextActions?.handleSelectMonth;
    const resolvedOnSelectYear = onSelectYear ?? contextActions?.handleSelectYear;

    const [show, setShow] = useState<boolean>(false);
    const [activeView, setActiveView] = useState<ViewMode>('months');

    // Fallback initial dates
    const initialDate = new Date();
    const [visibleYear, setVisibleYear] = useState<number>(initialDate.getFullYear());

    const currentYear = new Date().getFullYear();
    const [yearRangeStart, setYearRangeStart] = useState<number>(currentYear - 5);
    const [yearRangeEnd, setYearRangeEnd] = useState<number>(currentYear + 6);

    useEffect(() => {
        if (resolvedActivePeriod.type === 'month' && typeof resolvedActivePeriod.month === 'number') {
            setVisibleYear(resolvedActivePeriod.year ?? visibleYear);
        } else if (resolvedActivePeriod.type === 'year' && resolvedActivePeriod.year) {
            setVisibleYear(resolvedActivePeriod.year);
        }
    }, [resolvedActivePeriod, visibleYear]);

    const handleMonthClick = useCallback(
        (monthIndex: number) => {
            resolvedOnSelectMonth?.(visibleYear, monthIndex);
            setActiveView('months');
            setShow(false); // Auto-close on selection to make it snap!
        },
        [resolvedOnSelectMonth, visibleYear]
    );

    const handleYearClick = useCallback(
        (year: number) => {
            resolvedOnSelectYear?.(year);
            setVisibleYear(year);
            setActiveView('years');
            setShow(false); // Auto-close on selection to make it snap!
        },
        [resolvedOnSelectYear]
    );

    const handleToggle = useCallback((nextShow: boolean | undefined) => {
        setShow(nextShow ?? false);
    }, []);

    return (
        <Dropdown show={show} onToggle={handleToggle} className="period-range-dropdown d-flex flex-fill">
            <Dropdown.Toggle variant="outline-secondary" className="d-flex align-items-center justify-content-between w-100 bg-white">
                <div className="d-flex align-items-center gap-2 m-auto">
                    {renderIcon(FaCalendarAlt)}
                    <span className="period-range-selector__year-label">{resolvedLabel}</span>
                </div>
            </Dropdown.Toggle>
            <Dropdown.Menu className="p-2 p-md-3 period-range-selector w-100 shadow-sm border-0" style={{ minWidth: '280px' }}>
                <ButtonGroup className="w-100 mb-3 d-flex">
                    {VIEW_TABS.map((tab) => (
                        <Button
                            key={tab.key}
                            variant={activeView === tab.key ? 'success' : 'outline-secondary'}
                            size="sm"
                            className="flex-fill"
                            onClick={() => setActiveView(tab.key)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </ButtonGroup>

                {activeView === 'months' && (
                    <>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <Button
                                variant="link"
                                className="text-secondary p-0"
                                onClick={() => setVisibleYear((year) => year - 1)}
                            >
                                {renderIcon(FaChevronLeft)}
                            </Button>
                            <span className="fw-semibold">{visibleYear}</span>
                            <Button
                                variant="link"
                                className="text-secondary p-0"
                                onClick={() => setVisibleYear((year) => year + 1)}
                            >
                                {renderIcon(FaChevronRight)}
                            </Button>
                        </div>
                        <div
                            className="d-grid"
                            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.25rem' }}
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
                                        onClick={() => handleMonthClick(index)}
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
                            <span className="fw-semibold">{`${yearRangeStart} - ${yearRangeEnd}`}</span>
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
                            style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.25rem' }}
                        >
                            {Array.from({ length: 12 }).map((_, idx) => {
                                const buttonYear = yearRangeStart + idx;
                                const isSelected = resolvedActivePeriod.type === 'year' && resolvedActivePeriod.year === buttonYear;
                                return (
                                    <Button
                                        key={buttonYear}
                                        variant={isSelected ? 'success' : 'outline-secondary'}
                                        onClick={() => handleYearClick(buttonYear)}
                                        style={{ padding: '0.75rem 0.5rem' }}
                                    >
                                        {buttonYear}
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

export default MonthYearSelector;
