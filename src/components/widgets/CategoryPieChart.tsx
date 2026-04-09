'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

/**
 * CategoryPieChart - Donut Chart with Center Label + Legend Grid
 *
 * Mobile: tap a slice to expand it and see details in center
 * Desktop: hover shows tooltip, center shows totals
 */

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: number | string;
}

interface CategoryPieChartProps {
  data: PieChartData[];
  colors?: string[];
  formatValue?: (value: number) => string;
  height?: number | string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
  centerLabel?: string;
  onSliceClick?: (entry: PieChartData) => void;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  colors = [
    '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
    '#9333ea', '#ca8a04', '#be185d', '#047857', '#1d4ed8',
    '#b45309', '#0369a1', '#15803d', '#c026d3', '#b91c1c',
  ],
  formatValue = (value) => value.toString(),
  height = 300,
  innerRadius = '55%',
  outerRadius = '80%',
  centerLabel = 'All',
  onSliceClick,
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-5">No data available</div>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const getColor = (entry: PieChartData, index: number) =>
    (entry.color as string) || colors[index % colors.length] || '#8884d8';

  // Center label — shows selected slice detail or total
  const activeEntry = activeIndex !== null ? data[activeIndex] : null;
  const activePct = activeEntry
    ? ((activeEntry.value / total) * 100).toFixed(0)
    : null;


  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; payload: PieChartData }>;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white p-2 border rounded shadow-sm" style={{ fontSize: '13px' }}>
          <p className="mb-0 fw-semibold">{payload[0].name}</p>
          <p className="mb-0 text-primary">{formatValue(payload[0].value)}</p>
          <p className="mb-0 text-muted">{pct}%</p>
        </div>
      );
    }
    return null;
  };

  const isFlexHeight = height === '100%';

  const handleClick = (_entry: unknown, index: number) => {
    // First tap = select; second tap on same = deselect only (no drill)
    setActiveIndex(prev => prev === index ? null : index);
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: isFlexHeight ? '100%' : 'auto', padding: '0.5rem 1rem 1rem' }}
    >
      {/* Donut Chart + Center Overlay */}
      <div
        style={{ position: 'relative', flex: isFlexHeight ? 1 : 'none', minHeight: 0, height: isFlexHeight ? '100%' : 210 }}
      >
        <ResponsiveContainer width="100%" height={isFlexHeight ? '100%' : 210}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              isAnimationActive={false}
              onMouseDown={(_entry, index, event) => {
                (event as React.SyntheticEvent).stopPropagation();
                handleClick(_entry, index);
              }}
            >
              {data.map((entry, index) => {
                const isActive = activeIndex === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry, index)}
                    stroke={isActive ? 'white' : 'none'}
                    strokeWidth={isActive ? 3 : 0}
                    style={{
                      cursor: 'pointer',
                      opacity: activeIndex !== null && !isActive ? 0.45 : 1,
                      filter: isActive ? 'brightness(1.1)' : 'none',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — React-rendered so it always updates on state change */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          lineHeight: 1.3,
        }}>
          {activeEntry ? (
            <>
              <div style={{ fontSize: '11px', fontWeight: 600, color: getColor(activeEntry, activeIndex!), marginBottom: '2px', maxWidth: '80px', wordBreak: 'break-word' }}>
                {activeEntry.name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                {formatValue(activeEntry.value)}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {activePct}%
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{centerLabel}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                {formatValue(total)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', flexShrink: 0, marginTop: '8px' }}>
        {data.map((entry, index) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
          const isActive = activeIndex === index;
          return (
            <div
              key={entry.name}
              onClick={() => handleClick(entry, index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                minWidth: 0,
                cursor: 'pointer',
                opacity: activeIndex !== null && !isActive ? 0.5 : 1,
                fontWeight: isActive ? 700 : 400,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: isActive ? 11 : 9,
                height: isActive ? 11 : 9,
                borderRadius: '50%',
                backgroundColor: getColor(entry, index),
                flexShrink: 0,
                transition: 'width 0.2s, height 0.2s',
              }} />
              <span style={{ fontSize: '12px', color: isActive ? '#111827' : '#374151', whiteSpace: 'nowrap' }}>
                {entry.name} <span style={{ color: isActive ? '#374151' : '#9ca3af' }}>{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Go Deeper button — shown when active slice can drill down */}
      {activeIndex !== null && onSliceClick && (
        <button
          onClick={() => {
            const entry = data[activeIndex];
            if (entry) {
              onSliceClick(entry);
              setActiveIndex(null);
            }
          }}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '6px 0',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: `1.5px solid ${activeEntry ? getColor(activeEntry, activeIndex) : '#6c757d'}`,
            borderRadius: '8px',
            color: activeEntry ? getColor(activeEntry, activeIndex) : '#6c757d',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Go Deeper →
        </button>
      )}
    </div>
  );
};
