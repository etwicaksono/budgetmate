import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

interface BudgetProgressBarProps {
    spent: number;
    basicLimit: number;
    extendLimit: number;
    currency: string;
    label: string;
    isParent?: boolean;
}

export function BudgetProgressBar({ spent, basicLimit, extendLimit, currency, label, isParent = false }: BudgetProgressBarProps) {
    const { formatCurrency } = useFormattedCurrency();

    const absSpent = Math.abs(spent);
    const limit = basicLimit + extendLimit;

    let percentage = 0;
    let variant = 'success';

    if (limit > 0) {
        percentage = Math.min((absSpent / limit) * 100, 100);
    } else if (absSpent > 0 && limit === 0) {
        percentage = 100;
    }

    if (percentage >= 100) variant = 'danger';
    else if (percentage >= 80) variant = 'warning';

    return (
        <div className="w-100 mt-1 mb-2">
            <div className="d-flex justify-content-between align-items-center mb-1 w-100" style={{ fontSize: '11px', letterSpacing: '0.4px' }}>
                <span className={`text-uppercase ${isParent ? 'text-dark fw-bold' : 'text-secondary fw-semibold'}`}>{label}</span>
                <span className={percentage >= 100 ? 'text-danger fw-bold' : 'text-muted fw-medium'}>
                    <span className={spent < 0 ? 'text-danger' : ''}>
                        {formatCurrency(spent, currency)}
                    </span>
                    <span className="opacity-50 mx-1">/</span> {formatCurrency(basicLimit, currency)}
                    {extendLimit > 0 && (
                        <span className="ms-1" style={{ color: '#d97706' }}>
                            <span className="opacity-50 fw-normal mx-1">+</span>{formatCurrency(extendLimit, currency)}
                        </span>
                    )}
                </span>
            </div>
            <div
                className="progress w-100"
                style={{
                    height: '6px',
                    backgroundColor: 'var(--bs-gray-200)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}
            >
                <div
                    className={`progress-bar bg-${variant}`}
                    role="progressbar"
                    style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }}
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}
