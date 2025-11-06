# Balance Trend Widget

A comprehensive widget that displays balance trends over time with account breakdowns.

## Features

- **Balance Trend Chart**: Line chart showing balance changes over time
- **Total Balance Display**: Current total balance with percentage change indicator
- **Accounts List**: Detailed list of all accounts with their individual balances
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Shows spinner while fetching data
- **Error Handling**: Displays error messages when data fetch fails

## Usage

```tsx
import BalanceTrendWidget from '../components/Widget/BalanceTrendWidget';

// Basic usage
<BalanceTrendWidget />

// With custom formatting and styling
<BalanceTrendWidget
  formatCurrency={(value) => `$${value.toFixed(2)}`}
  height={400}
  lineColor="#00C49F"
/>
```

## Props

- `formatCurrency?: (value: number) => string` - Custom currency formatting function
- `height?: number` - Chart height in pixels (default: 300)
- `lineColor?: string` - Line color for the trend chart (default: '#2563eb')

## Data Source

The widget fetches data from `analyticsService.fetchBalanceTrend()` which currently returns dummy data.

### Switching to Real API

When the backend API is ready, simply update the `fetchBalanceTrend` method in `src/services/analyticsService.ts`:

```typescript
async fetchBalanceTrend(params = {}) {
  // Uncomment and update this code when API is ready:
  const response = await apiService.get('/analytics/balance-trend', {
    start_date: params.startDate ?? undefined,
    end_date: params.endDate ?? undefined,
    account_id: params.accountId ?? undefined,
  });

  if (isApiResponse<BalanceTrendData>(response)) {
    return response.data ?? generateDummyBalanceTrend();
  }

  return response as BalanceTrendData;
}
```

## Data Structure

### BalanceTrendData
```typescript
interface BalanceTrendData {
  balanceData: BalanceDataPoint[];  // Time series data
  accounts: AccountBalance[];        // List of accounts
  totalBalance: number;              // Current total balance
  percentChange: number;             // Percentage change
}

interface BalanceDataPoint {
  date: string;      // Date in format 'M/D/YYYY'
  balance: number;   // Balance amount
}

interface AccountBalance {
  name: string;      // Account name
  type: string;      // Account type
  balance: number;   // Account balance
  icon: string;      // Icon name (e.g., 'FaWallet')
  color: string;     // Color hex code
}
```

## Example in Dashboard/Reports

```tsx
// Add to your widgets map
const widgets = {
  balanceTrend: {
    title: 'Balance Trend',
    component: (
      <BalanceTrendWidget
        formatCurrency={formatCurrency}
        height={350}
        lineColor="#2563eb"
      />
    ),
  },
  // ... other widgets
};

// Add to widget order
const DEFAULT_WIDGET_ORDER = [
  'balanceTrend',
  'expensesByCategory',
  'incomeVsExpenses',
  // ...
];
```
