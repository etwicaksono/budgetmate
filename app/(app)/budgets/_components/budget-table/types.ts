import { CombinedBudgetItem } from '../../types';

// Flat item for the grid
export interface Row extends CombinedBudgetItem {
  id: string;
  isParent: boolean;
  parentId: string | null;
  hasChildren: boolean;
  isCollapsed?: boolean;
  isSummary?: boolean;
  parentName?: string;
  // Read-only calculated fields
  periodicMargin: number;
  dailyBudget: number;
  periodicAvailablePercentage: number;
  annualMargin: number;
}
