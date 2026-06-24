'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Form, Placeholder } from 'react-bootstrap';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  analyticsService,
  type AdvancedChartsResponse,
  type AdvancedChartDataType,
  type AdvancedChartGraphType,
  type AdvancedChartGranularity,
  type AdvancedChartGroupBy,
} from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

export interface AdvancedChartsReportProps {
  startDate?: string;
  endDate?: string;
  selectedCategories?: string[];
  selectedAccounts?: string[];
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
  transferOption?: string;
  debtOption?: string;
  selectedLabelIds?: string[];
}

const formatNumberAbbreviation = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${sign}${(absValue / 1_000).toFixed(0)}k`;
  return `${sign}${absValue.toFixed(0)}`;
};

const CHART_COLORS = [
  '#2563eb', '#22c55e', '#f97316', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#eab308', '#14b8a6', '#6366f1',
];

const AdvancedChartsReport: React.FC<AdvancedChartsReportProps> = ({
  startDate,
  endDate,
  searchTerm,
  minAmount,
  maxAmount,
  transferOption,
  debtOption,
  selectedLabelIds,
  selectedCategories,
  selectedAccounts,
}) => {
  const [data, setData] = useState<AdvancedChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dataType, setDataType] = useState<AdvancedChartDataType>('balance');
  const [graphType, setGraphType] = useState<AdvancedChartGraphType>('line');
  const [groupBy, setGroupBy] = useState<AdvancedChartGroupBy>('none');
  const [granularity, setGranularity] = useState<AdvancedChartGranularity>('day');

  const { formatCurrency } = useFormattedCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: {
          start_date?: string;
          end_date?: string;
          type?: AdvancedChartDataType;
          granularity?: AdvancedChartGranularity;
          group_by?: AdvancedChartGroupBy;
          search?: string;
          min_amount?: number;
          max_amount?: number;
          transfer_option?: string;
          debt_option?: string;
          label_ids?: string[];
          category_ids?: string[];
          account_ids?: string[];
        } = {
          type: dataType,
          granularity,
          group_by: groupBy,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (searchTerm) params.search = searchTerm;
        if (minAmount !== undefined) params.min_amount = minAmount;
        if (maxAmount !== undefined) params.max_amount = maxAmount;
        if (transferOption) params.transfer_option = transferOption;
        if (debtOption) params.debt_option = debtOption;
        if (selectedLabelIds?.length) params.label_ids = selectedLabelIds;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;

        const response = await analyticsService.fetchAdvancedCharts(params);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, dataType, granularity, groupBy, searchTerm, minAmount, maxAmount, transferOption, debtOption, selectedLabelIds, selectedCategories, selectedAccounts]);

  const currentChartData = useMemo(() => {
    if (!data) return { chartData: [], groupedData: [] };
    return { chartData: data.chartData, groupedData: data.groupedData };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string; name?: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-2 fw-bold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mb-1" style={{ color: entry.color }}>
              {entry.name || entry.dataKey}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    if (!currentChartData.chartData.length && !currentChartData.groupedData.length) {
      return (
        <div className="d-flex align-items-center justify-content-center h-100 text-muted">
          No data available for the selected period
        </div>
      );
    }

    const hasGroupedData = groupBy !== 'none' && currentChartData.groupedData.length > 0;
    let chartDataForRender: Array<Record<string, number | string>> = [];
    let dataKeys: Array<{ key: string; color: string; name: string }> = [];

    if (hasGroupedData) {
      const dateMap = new Map<string, Record<string, number | string>>();

      currentChartData.groupedData.forEach((group, idx) => {
        group.data.forEach(point => {
          if (!dateMap.has(point.date)) {
            dateMap.set(point.date, { date: point.date });
          }
          const entry = dateMap.get(point.date)!;
          entry[group.groupId] = point.value;
        });
        dataKeys.push({
          key: group.groupId,
          color: group.color ?? CHART_COLORS[idx % CHART_COLORS.length]!,
          name: group.groupName,
        });
      });

      chartDataForRender = Array.from(dateMap.values());
    } else {
      chartDataForRender = currentChartData.chartData.map((p) => ({
        date: p.date,
        value: p.value,
      }));
      dataKeys = [{ key: 'value', color: '#2563eb', name: 'Value' }];
    }

    const commonProps = {
      data: chartDataForRender,
      margin: { top: 10, right: 10, left: 10, bottom: 20 },
    };

    const xAxisProps = {
      dataKey: 'date',
      tick: { fontSize: 10, fill: '#6c757d' },
      tickMargin: 10,
      axisLine: { stroke: '#e9ecef' },
      tickLine: false,
    };

    const yAxisProps = {
      tickFormatter: formatNumberAbbreviation,
      tick: { fontSize: 11, fill: '#6c757d' },
      axisLine: false,
      tickLine: false,
      width: 60,
    };

    if (graphType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {hasGroupedData && <Legend />}
            {dataKeys.map((dk) => (
              <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (graphType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {hasGroupedData && <Legend />}
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                fill={dk.color}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {hasGroupedData && <Legend />}
          {dataKeys.map((dk) => (
            <Line
              key={dk.key}
              type="monotone"
              dataKey={dk.key}
              name={dk.name}
              stroke={dk.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderSkeleton = () => (
    <div>
      <div className="d-flex gap-3 mb-4 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Placeholder key={i} animation="glow" style={{ width: 150 }}>
            <Placeholder xs={12} style={{ height: 38 }} />
          </Placeholder>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body style={{ height: 400 }}>
          <Placeholder animation="glow" className="h-100 d-flex align-items-center justify-content-center">
            <div className="text-muted">Loading chart...</div>
          </Placeholder>
        </Card.Body>
      </Card>
    </div>
  );

  if (loading && !data) return renderSkeleton();

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="advanced-charts-report">
      <style>{`
        .advanced-charts-report .form-select {
          font-size: 0.875rem;
        }
      `}</style>

      <div className="d-flex gap-3 mb-4 flex-wrap align-items-end">
        <div>
          <Form.Label className="small text-muted mb-1">Type</Form.Label>
          <Form.Select
            size="sm"
            value={dataType}
            onChange={(e) => setDataType(e.target.value as AdvancedChartDataType)}
            style={{ minWidth: 160 }}
          >
            <option value="balance">Balance</option>
            <option value="cashflow">Cashflow</option>
            <option value="cumulative_cashflow">Cumulative Cashflow</option>
          </Form.Select>
        </div>

        <div>
          <Form.Label className="small text-muted mb-1">Graph type</Form.Label>
          <Form.Select
            size="sm"
            value={graphType}
            onChange={(e) => setGraphType(e.target.value as AdvancedChartGraphType)}
            style={{ minWidth: 120 }}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
          </Form.Select>
        </div>

        <div>
          <Form.Label className="small text-muted mb-1">Group by</Form.Label>
          <Form.Select
            size="sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as AdvancedChartGroupBy)}
            style={{ minWidth: 120 }}
          >
            <option value="none">None</option>
            <option value="accounts">Accounts</option>
            <option value="categories">Categories</option>
          </Form.Select>
        </div>

        <div>
          <Form.Label className="small text-muted mb-1">Granularity</Form.Label>
          <Form.Select
            size="sm"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as AdvancedChartGranularity)}
            style={{ minWidth: 100 }}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </Form.Select>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body style={{ height: 400 }}>
          {loading ? (
            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
              Loading...
            </div>
          ) : (
            renderChart()
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdvancedChartsReport;
