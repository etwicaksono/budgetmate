import React, { useMemo, useState } from 'react';
import { CategoryPieChart, type PieChartData } from '@/components/widgets';
import type { ExpenseByCategory } from '@/services/analyticsService';

export interface ExpensesByCategoryWidgetProps {
  allExpenseCategories: ExpenseByCategory[];
  formatCurrencyValue: (value: number) => string;
  height?: string | number;
}

export const ExpensesByCategoryWidget: React.FC<ExpensesByCategoryWidgetProps> = ({
  allExpenseCategories,
  formatCurrencyValue,
  height,
}) => {
  const isExpanded = height === '100%';
  const [drilledParent, setDrilledParent] = useState<{ id: string; name: string } | null>(null);

  const parentGroupedData = useMemo((): PieChartData[] => {
    const parentMap = new Map<string, { name: string; value: number; color: string; id: string }>();

    for (const exp of allExpenseCategories) {
      if (exp.parent_id) {
        const existing = parentMap.get(exp.parent_id);
        if (existing) {
          existing.value += exp.amount;
        } else {
          parentMap.set(exp.parent_id, {
            id: exp.parent_id,
            name: exp.parent_name ?? exp.category_name,
            value: exp.amount,
            color: exp.color,
          });
        }
      } else {
        const existing = parentMap.get(exp.category_id);
        if (existing) {
          existing.value += exp.amount;
        } else {
          parentMap.set(exp.category_id, {
            id: exp.category_id,
            name: exp.category_name,
            value: exp.amount,
            color: exp.color,
          });
        }
      }
    }

    return Array.from(parentMap.values())
      .sort((a, b) => b.value - a.value)
      .map((p) => ({ name: p.name, value: p.value, color: p.color, id: p.id }));
  }, [allExpenseCategories]);

  const childrenData = useMemo((): PieChartData[] => {
    if (!drilledParent) return [];

    const palette = [
      '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
      '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
      '#9333ea', '#ca8a04', '#be185d', '#047857', '#1d4ed8',
    ];

    return allExpenseCategories
      .filter((e) => e.parent_id === drilledParent.id || e.category_id === drilledParent.id)
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({
        name: e.category_name,
        value: e.amount,
        color: palette[i % palette.length] ?? '#6c757d',
      }));
  }, [allExpenseCategories, drilledParent]);

  const chartData = drilledParent ? childrenData : parentGroupedData;
  const chartHeight = isExpanded ? '100%' : 350;

  const handleSliceClick = (entry: PieChartData) => {
    if (drilledParent) return;
    const parentId = (entry as PieChartData & { id?: string }).id;
    if (!parentId) return;
    const hasChildren = allExpenseCategories.some((e) => e.parent_id === parentId);
    if (hasChildren) {
      setDrilledParent({ id: parentId, name: entry.name });
    }
  };

  return (
    <div style={{ height: isExpanded ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
      {drilledParent && (
        <div className="d-flex align-items-center gap-2 px-3 pb-1" style={{ flexShrink: 0 }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            style={{ fontSize: '11px', padding: '2px 8px' }}
            onClick={() => setDrilledParent(null)}
          >
            ← Back
          </button>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>{drilledParent.name}</span>
        </div>
      )}

      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
        }}
      >
        {chartData.length > 0 ? (
          <CategoryPieChart
            data={chartData}
            formatValue={(value) => formatCurrencyValue(value)}
            height={chartHeight}
            centerLabel={drilledParent ? drilledParent.name : 'All'}
            {...(drilledParent ? {} : { onSliceClick: handleSliceClick })}
          />
        ) : (
          <div className="text-center py-5 text-muted">No expense data available</div>
        )}
      </div>
    </div>
  );
};
