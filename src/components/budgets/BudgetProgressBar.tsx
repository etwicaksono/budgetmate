import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaInfoCircle } from 'react-icons/fa';

interface BudgetProgressBarProps {
    spent: number;
    basicLimit: number;
    extendLimit: number;
    currency: string;
    label: string;
    isParent?: boolean;
}

export function BudgetProgressBar({ spent, basicLimit, extendLimit, currency, label, isParent = false }: BudgetProgressBarProps) {
    const { formatCurrency, formatShort } = useFormattedCurrency();

    const absSpent = Math.abs(spent);
    const limit = basicLimit + extendLimit;
    const noLimitWithSpend = limit === 0 && absSpent > 0;

    // True (uncapped) percentage — used to detect over-budget
    let truePercentage = 0;
    if (limit > 0) {
        truePercentage = (absSpent / limit) * 100;
    }

    // No budget set but has spending = treat as over (red + animated)
    const isOver    = truePercentage > 100 || noLimitWithSpend;
    const isAtLimit = truePercentage === 100 && !noLimitWithSpend;
    const barWidth  = Math.min(truePercentage, 100);
    const overageStr = isOver ? `+${(truePercentage - 100).toFixed(1)}%` : null;

    // Orange is custom (#f97316) — Bootstrap 'warning' is yellow, not orange
    const ORANGE = '#f97316';
    let variant = 'success';
    if (isOver) variant = 'danger';
    else if (truePercentage >= 80) variant = 'warning';  // yellow for 80-99%
    // isAtLimit uses inline orange style, variant stays 'success' placeholder


    const overageBadge = isOver ? (
        <span
            className="badge bg-danger text-white"
            style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.3px' }}
        >
            {noLimitWithSpend ? 'No limit' : overageStr}
        </span>
    ) : null;

    const tooltipId = `budget-tooltip-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`;



    return (
        <div className="w-100 mt-1 mb-2">
            {/* Label row */}
            <div className="d-flex justify-content-between align-items-center mb-1 w-100" style={{ fontSize: '11px', letterSpacing: '0.4px' }}>
                <span className={`text-uppercase ${isParent ? 'text-dark fw-bold' : 'text-secondary fw-semibold'}`}>{label}</span>
                <div className="d-flex align-items-center gap-1">
                    {overageBadge}
                    <span
                        className={`fw-bold ms-1 ${isOver ? 'text-danger' : 'text-muted'}`}
                        style={{ fontSize: '11px', ...(isAtLimit ? { color: ORANGE } : {}) }}
                    >
                        {Math.min(truePercentage, 100).toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Amounts row — mobile: compact numbers */}
            <div className="d-md-none">
                {limit === 0 && absSpent === 0 ? (
                    <div className="mb-1 text-muted fst-italic" style={{ fontSize: '11px' }}>No budget set</div>
                ) : (
                    <div className="d-flex flex-wrap align-items-baseline gap-1 mb-1" style={{ fontSize: '11px' }}>
                        <span className={isOver ? 'text-danger fw-semibold' : 'fw-semibold'}>
                            {formatShort(absSpent, currency)}
                        </span>
                        {limit > 0 && (
                            <>
                                <span className="text-muted opacity-50">/</span>
                                <span className="text-muted">{formatShort(basicLimit, currency)}</span>
                            </>
                        )}
                        {extendLimit > 0 ? (
                            <>
                                <span style={{ color: '#d97706' }}>
                                    <span className="opacity-50 fw-normal">+</span> {formatShort(extendLimit, currency)}
                                </span>
                                {/* Info icon — tooltip shows full format */}
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id={`${tooltipId}-mobile`}>
                                            <div className="text-start" style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                                <div>Basic: <strong>{formatCurrency(basicLimit, currency)}</strong></div>
                                                <div style={{ color: '#fbbf24' }}>Extend: <strong>{formatCurrency(extendLimit, currency)}</strong></div>
                                                <hr className="my-1 border-secondary opacity-50" />
                                                <div>Total: <strong>{formatCurrency(limit, currency)}</strong></div>
                                            </div>
                                        </Tooltip>
                                    }
                                >
                                    <span
                                        className="text-muted d-inline-flex align-items-center"
                                        style={{ cursor: 'help', opacity: 0.6 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <FaInfoCircle size={11} />
                                    </span>
                                </OverlayTrigger>
                            </>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Amounts row — desktop: full numbers */}
            <div className="d-none d-md-block">
                {limit === 0 && absSpent === 0 ? (
                    <div className="mb-1 text-muted fst-italic" style={{ fontSize: '11px' }}>No budget set</div>
                ) : (
                    <div className="d-flex flex-wrap align-items-baseline gap-1 mb-1" style={{ fontSize: '11px' }}>
                        <span className={isOver ? 'text-danger fw-semibold' : 'fw-semibold'}>
                            {formatCurrency(absSpent, currency)}
                        </span>
                        {limit > 0 && (
                            <>
                                <span className="text-muted opacity-50">/</span>
                                <span className="text-muted">{formatCurrency(basicLimit, currency)}</span>
                            </>
                        )}
                        {extendLimit > 0 ? (
                            <>
                                <span style={{ color: '#d97706' }}>
                                    <span className="opacity-50 fw-normal">+</span> {formatCurrency(extendLimit, currency)}
                                </span>
                                {/* Info icon — tooltip shows full format */}
                                <OverlayTrigger
                                    placement="top"
                                    overlay={
                                        <Tooltip id={`${tooltipId}-desktop`}>
                                            <div className="text-start" style={{ fontSize: '12px', lineHeight: 1.6 }}>
                                                <div>Basic: <strong>{formatCurrency(basicLimit, currency)}</strong></div>
                                                <div style={{ color: '#fbbf24' }}>Extend: <strong>{formatCurrency(extendLimit, currency)}</strong></div>
                                                <hr className="my-1 border-secondary opacity-50" />
                                                <div>Total: <strong>{formatCurrency(limit, currency)}</strong></div>
                                            </div>
                                        </Tooltip>
                                    }
                                >
                                    <span
                                        className="text-muted d-inline-flex align-items-center"
                                        style={{ cursor: 'help', opacity: 0.6 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <FaInfoCircle size={11} />
                                    </span>
                                </OverlayTrigger>
                            </>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div
                className="progress w-100"
                style={{
                    height: '6px',
                    backgroundColor: 'var(--bs-gray-200)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'default',
                }}
            >
                <div
                    className={`progress-bar${isOver ? ' bg-danger progress-bar-striped progress-bar-animated' : isAtLimit ? '' : ` bg-${variant}`}`}
                    role="progressbar"
                    style={{
                        width: `${noLimitWithSpend ? 100 : barWidth}%`,
                        transition: 'width 0.5s ease-in-out',
                        ...(isAtLimit ? { backgroundColor: ORANGE } : {})
                    }}
                    aria-valuenow={barWidth}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}
