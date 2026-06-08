import { Category } from '@/services/categoryService';
import { CategoryBudget } from '@/services/budgetService';

export interface CombinedBudgetItem {
  category: Category;
  budget: CategoryBudget | null;
  spentMonthly: number;
  spentAnnual: number;
  basicMonthly: number;
  extendMonthly: number;
  basicAnnual: number;
  extendAnnual: number;
  hasMonthly: boolean;
  hasAnnual: boolean;
  projectedAnnual: number;
  children?: CombinedBudgetItem[];
  shouldRender?: boolean;
}
