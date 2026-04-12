import React, { useMemo } from 'react';
import { Nav } from 'react-bootstrap';
import { BalanceTrendChart, type TrendChartData } from '@/components/widgets';

export interface BalanceTrendWidgetProps {
  data: TrendChartData[];
  currencyBalances: { currency: string; balance: number }[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

export const BalanceTrendWidget: React.FC<BalanceTrendWidgetProps> = ({
  data,
  currencyBalances,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  // Get unique currencies from data
  const availableCurrencies = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstDataPoint = data[0];
    if (!firstDataPoint) return [];
    return Object.keys(firstDataPoint)
      .filter(
        (key) => key !== 'date' && key !== 'balance' && typeof firstDataPoint[key] === 'number'
      )
      .sort();
  }, [data]);

  // Filter data to show only selected currency
  const filteredData = useMemo(() => {
    if (!selectedCurrency) return data;
    return data.map((point) => ({
      date: point.date,
      [selectedCurrency]: point[selectedCurrency],
    }));
  }, [data, selectedCurrency]);

  // Get balance for selected currency from the last data point of the filtered period
  const selectedBalance = useMemo(() => {
    if (filteredData.length > 0) {
      const lastPoint = filteredData[filteredData.length - 1];
      const val = lastPoint?.[selectedCurrency];
      if (typeof val === 'number') {
        return val;
      }
    }
    // Fallback to global balances if no trend data exists
    const cb = currencyBalances.find((c) => c.currency === selectedCurrency);
    return cb?.balance ?? 0;
  }, [filteredData, currencyBalances, selectedCurrency]);

  // Calculate percent change for selected currency
  const percentChange = useMemo(() => {
    if (filteredData.length < 2 || !selectedCurrency) return 0;
    const firstValue = filteredData[0]?.[selectedCurrency];
    const lastValue = filteredData[filteredData.length - 1]?.[selectedCurrency];
    if (typeof firstValue !== 'number' || typeof lastValue !== 'number' || firstValue === 0) return 0;
    return Number((((lastValue - firstValue) / firstValue) * 100).toFixed(2));
  }, [filteredData, selectedCurrency]);

  const isExpanded = height === '100%';
  const hasTabs = availableCurrencies.length > 1;

  return (
    <div
      style={{
        height: isExpanded ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {availableCurrencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: '13px',
                  borderRadius: '16px',
                }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}
      {/* Chart */}
      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
        }}
      >
        <BalanceTrendChart
          data={filteredData}
          totalBalance={selectedBalance}
          currencyBalances={[{ currency: selectedCurrency, balance: selectedBalance }]}
          percentChange={percentChange}
          formatValue={(value) => formatCurrencyValue(value, selectedCurrency)}
          formatCurrency={(value, currency) => formatCurrencyValue(value, currency)}
          height={isExpanded ? '100%' : hasTabs ? 310 : 350}
          lineColor="#2563eb"
        />
      </div>
    </div>
  );
};
