import { useState, useMemo, useCallback, useEffect } from 'react';
import { SortColumn } from 'react-data-grid';
import { CombinedBudgetItem } from '../../../types';
import { Row } from '../types';

export function useBudgetGridData(
  data: CombinedBudgetItem[], 
  dirtyRowsRef: React.MutableRefObject<Record<string, Row>>,
  viewMode: 'grouped' | 'flat' = 'grouped'
) {
  const [rows, setRows] = useState<Row[]>([]);
  const [originalRows, setOriginalRows] = useState<Row[]>([]);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  // Memoize sorted data
  const processedData = useMemo(() => {
    let pData = [...data];

    if (viewMode === 'flat') {
      const flatList: CombinedBudgetItem[] = [];
      pData.forEach(parent => {
        if (parent.children && parent.children.length > 0) {
          parent.children.forEach(child => {
            flatList.push({ ...child, parentName: parent.category.name } as CombinedBudgetItem);
          });
        } else {
          flatList.push({ ...parent, parentName: '' } as CombinedBudgetItem);
        }
      });
      pData = flatList;
    }

    if (sortColumns.length > 0 && sortColumns[0]) {
      const sortCol = sortColumns[0];
      const dir = sortCol.direction === 'ASC' ? 1 : -1;
      const key = sortCol.columnKey;

      const getVal = (item: CombinedBudgetItem) => {
        if (key === 'name') {
           const itemName = item.category.name.toLowerCase();
           if (viewMode === 'flat') {
             const pName = item.parentName ? item.parentName.toLowerCase() : '';
             return pName ? `${pName} - ${itemName}` : itemName;
           }
           return itemName;
        }
        if (key === 'periodicMargin') return item.basicMonthly + item.extendMonthly - Math.abs(item.spentMonthly);
        if (key === 'dailyBudget') return (item.basicMonthly + item.extendMonthly) / 30;
        if (key === 'periodicAvailablePercentage') return (item.basicMonthly + item.extendMonthly) > 0 ? (Math.abs(item.spentMonthly) / (item.basicMonthly + item.extendMonthly)) * 100 : 0;
        if (key === 'annualMargin') return item.basicAnnual + item.extendAnnual - Math.abs(item.spentAnnual);
        if (key === 'spentMonthly') return Math.abs(item.spentMonthly ?? 0);
        if (key === 'spentAnnual') return Math.abs(item.spentAnnual ?? 0);
        return item[key as keyof CombinedBudgetItem] ?? 0;
      };

      const compare = (a: CombinedBudgetItem, b: CombinedBudgetItem) => {
        const vA = getVal(a);
        const vB = getVal(b);
        if (typeof vA === 'string' && typeof vB === 'string') return vA.localeCompare(vB) * dir;
        return ((vA as number) - (vB as number)) * dir;
      };

      pData.sort(compare);
      
      if (viewMode === 'grouped') {
        pData = pData.map(parent => {
          if (parent.children) {
            return { ...parent, children: [...parent.children].sort(compare) };
          }
          return parent;
        });
      }
    }
    return pData;
  }, [data, sortColumns, viewMode]);

  const buildGridRows = useCallback((pData: CombinedBudgetItem[], collapsed: Set<string>, dirtyData: Record<string, Row>, mode: 'grouped' | 'flat') => {
    const flattened: Row[] = [];
    
    let summaryBasicMonthly = 0;
    let summaryExtendMonthly = 0;
    let summarySpentMonthly = 0;
    let summaryBasicAnnual = 0;
    let summaryExtendAnnual = 0;
    let summarySpentAnnual = 0;

    if (mode === 'flat') {
      pData.forEach((item: CombinedBudgetItem) => {
        const cData = dirtyData[item.category.id] || item;
        const pBasicMonthly = cData.basicMonthly || 0;
        const pExtendMonthly = cData.extendMonthly || 0;
        const pSpentMonthly = cData.spentMonthly || 0;
        const pBasicAnnual = cData.basicAnnual || 0;
        const pExtendAnnual = cData.extendAnnual || 0;
        const pSpentAnnual = cData.spentAnnual || 0;

        summaryBasicMonthly += pBasicMonthly;
        summaryExtendMonthly += pExtendMonthly;
        summarySpentMonthly += pSpentMonthly;
        summaryBasicAnnual += pBasicAnnual;
        summaryExtendAnnual += pExtendAnnual;
        summarySpentAnnual += pSpentAnnual;

        const cRow: Row = {
          ...item,
          ...cData,
          id: item.category.id,
          isParent: false,
          parentId: null,
          hasChildren: false,
          parentName: item.parentName ?? '',
          periodicMargin: pBasicMonthly + pExtendMonthly - Math.abs(pSpentMonthly),
          dailyBudget: (pBasicMonthly + pExtendMonthly) / 30,
          periodicAvailablePercentage: (pBasicMonthly + pExtendMonthly) > 0 ? (Math.abs(pSpentMonthly) / (pBasicMonthly + pExtendMonthly)) * 100 : 0,
          annualMargin: pBasicAnnual + pExtendAnnual - Math.abs(pSpentAnnual),
        };
        flattened.push(cRow);
      });
    } else {
      pData.forEach((parent: CombinedBudgetItem) => {
        let pBasicMonthly = 0;
        let pExtendMonthly = 0;
        let pSpentMonthly = 0;
        let pBasicAnnual = 0;
        let pExtendAnnual = 0;
        let pSpentAnnual = 0;

        if (parent.children && parent.children.length > 0) {
          parent.children.forEach(child => {
            const cRow = dirtyData[child.category.id] || child;
            pBasicMonthly += cRow.basicMonthly || 0;
            pExtendMonthly += cRow.extendMonthly || 0;
            pSpentMonthly += cRow.spentMonthly || 0;
            pBasicAnnual += cRow.basicAnnual || 0;
            pExtendAnnual += cRow.extendAnnual || 0;
            pSpentAnnual += cRow.spentAnnual || 0;
          });
        } else {
          const pRow = dirtyData[parent.category.id] || parent;
          pBasicMonthly = pRow.basicMonthly || 0;
          pExtendMonthly = pRow.extendMonthly || 0;
          pSpentMonthly = pRow.spentMonthly || 0;
          pBasicAnnual = pRow.basicAnnual || 0;
          pExtendAnnual = pRow.extendAnnual || 0;
          pSpentAnnual = pRow.spentAnnual || 0;
        }

        summaryBasicMonthly += pBasicMonthly;
        summaryExtendMonthly += pExtendMonthly;
        summarySpentMonthly += pSpentMonthly;
        summaryBasicAnnual += pBasicAnnual;
        summaryExtendAnnual += pExtendAnnual;
        summarySpentAnnual += pSpentAnnual;

        const pRow: Row = {
          ...(dirtyData[parent.category.id] || parent),
          id: parent.category.id,
          isParent: true,
          parentId: null,
          hasChildren: !!parent.children && parent.children.length > 0,
          basicMonthly: pBasicMonthly,
          extendMonthly: pExtendMonthly,
          spentMonthly: pSpentMonthly,
          basicAnnual: pBasicAnnual,
          extendAnnual: pExtendAnnual,
          spentAnnual: pSpentAnnual,
          periodicMargin: pBasicMonthly + pExtendMonthly - Math.abs(pSpentMonthly),
          dailyBudget: (pBasicMonthly + pExtendMonthly) / 30,
          periodicAvailablePercentage: (pBasicMonthly + pExtendMonthly) > 0 ? (Math.abs(pSpentMonthly) / (pBasicMonthly + pExtendMonthly)) * 100 : 0,
          annualMargin: pBasicAnnual + pExtendAnnual - Math.abs(pSpentAnnual),
          isCollapsed: collapsed.has(parent.category.id),
        };
        flattened.push(pRow);

        if (parent.children && !collapsed.has(parent.category.id)) {
          parent.children.forEach((child: CombinedBudgetItem) => {
            const cData = dirtyData[child.category.id] || child;
            const cRow: Row = {
              ...child,
              ...cData,
              id: child.category.id,
              isParent: false,
              parentId: parent.category.id,
              hasChildren: false,
              periodicMargin: cData.basicMonthly + cData.extendMonthly - Math.abs(cData.spentMonthly),
              dailyBudget: (cData.basicMonthly + cData.extendMonthly) / 30,
              periodicAvailablePercentage: (cData.basicMonthly + cData.extendMonthly) > 0 ? (Math.abs(cData.spentMonthly) / (cData.basicMonthly + cData.extendMonthly)) * 100 : 0,
              annualMargin: cData.basicAnnual + cData.extendAnnual - Math.abs(cData.spentAnnual),
            };
            flattened.push(cRow);
          });
        }
      });
    }

    const summary = {
      id: 'summary-row',
      isParent: false,
      parentId: null,
      hasChildren: false,
      isSummary: true,
      category: { id: 'summary-row', name: 'Total', color: '#6c757d', icon: '', type: 'expense', analytic_flag: 'expense', nature: 'NEED', is_active: true, parent_id: null } as unknown as Row['category'],
      basicMonthly: summaryBasicMonthly,
      extendMonthly: summaryExtendMonthly,
      spentMonthly: summarySpentMonthly,
      periodicMargin: summaryBasicMonthly + summaryExtendMonthly - Math.abs(summarySpentMonthly),
      dailyBudget: (summaryBasicMonthly + summaryExtendMonthly) / 30,
      periodicAvailablePercentage: (summaryBasicMonthly + summaryExtendMonthly) > 0 ? (Math.abs(summarySpentMonthly) / (summaryBasicMonthly + summaryExtendMonthly)) * 100 : 0,
      basicAnnual: summaryBasicAnnual,
      extendAnnual: summaryExtendAnnual,
      spentAnnual: summarySpentAnnual,
      annualMargin: summaryBasicAnnual + summaryExtendAnnual - Math.abs(summarySpentAnnual),
    };

    return [...flattened, summary as unknown as Row];
  }, []);

  // Flatten the data on mount or when data changes
  useEffect(() => {
    const newRows = buildGridRows(processedData, collapsedParents, dirtyRowsRef.current, viewMode);
    setRows(newRows);
    setOriginalRows(JSON.parse(JSON.stringify(newRows)));
  }, [processedData, collapsedParents, buildGridRows, dirtyRowsRef, viewMode]);

  const expandAll = useCallback(() => setCollapsedParents(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedParents(new Set(data.map(d => d.category.id))), [data]);

  return {
    rows,
    setRows,
    originalRows,
    setOriginalRows,
    sortColumns,
    setSortColumns,
    collapsedParents,
    setCollapsedParents,
    processedData,
    buildGridRows,
    expandAll,
    collapseAll
  };
}
