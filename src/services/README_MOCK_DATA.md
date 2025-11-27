# Mock Data System

## Overview

This project uses a centralized mock data system for development and testing. All dummy data is stored in `mockData.ts` for easy management and switching to real APIs.

## Quick Start

### Switch Between Mock and Real Data

Open `src/services/mockData.ts` and change the flag:

```typescript
// Use mock data (for development/testing)
export const USE_MOCK_DATA = true;

// Use real API (for production)
export const USE_MOCK_DATA = false;
```

**That's it!** All services will automatically use mock or real data based on this flag.

## How It Works

### Architecture

```
Dashboard
    ↓
Services (accountService, analyticsService, etc.)
    ↓
Check USE_MOCK_DATA flag
    ↓
If true → mockDataService → Returns dummy data
If false → api.ts → Calls real backend API
```

### Service Implementation

Each service checks the flag before making API calls:

```typescript
// Example: accountService.ts
async fetchAccounts(): Promise<Account[]> {
  if (USE_MOCK_DATA) {
    return mockDataService.fetchAccounts(); // Returns dummy data
  }
  const response = await api.get('/accounts'); // Calls real API
  return response.data;
}
```

## Mock Data Configuration

### Available Mock Data

All mock data is defined in `src/services/mockData.ts`:

- **mockAccounts** - 3 sample accounts (Cash, Bank, Savings)
- **mockExpensesByCategory** - Expense breakdown by category
- **mockTransactions** - 5 sample transactions
- **mockBudgetStatus** - 4 budget categories with spending
- **mockBalanceTrend** - Balance over time
- **mockIncomeExpenseTrend** - Income vs Expense comparison

### Customize Mock Data

Edit `src/services/mockData.ts` to add/modify dummy data:

```typescript
export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'My Wallet',
    balance: 1000000,
    // ... add more fields
  },
  // Add more accounts here
];
```

### Simulate Network Delay

Mock data includes realistic network delays (800ms by default):

```typescript
const MOCK_DELAY = 800; // Change this value to simulate faster/slower network
```

## Services Using Mock Data

All services support the mock data flag:

| Service | Mock Data Available |
|---------|-------------------|
| accountService | ✅ Accounts |
| analyticsService | ✅ Expenses, Trends |
| budgetService | ✅ Budget Status |
| transactionService | ✅ Transactions |
| categoryService | ❌ Not implemented yet |
| authService | ❌ Not implemented yet |

## Testing Workflow

### Development with Mock Data

1. Set `USE_MOCK_DATA = true`
2. Run `npm run dev`
3. Dashboard loads with dummy data
4. No backend required!

### Testing with Real API

1. Ensure backend is running
2. Set `USE_MOCK_DATA = false`
3. Run `npm run dev`
4. Dashboard fetches from real API

### Production Deployment

1. Set `USE_MOCK_DATA = false`
2. Run `npm run build`
3. Deploy to production

## Benefits

✅ **Easy switching** - One flag to control all services  
✅ **Centralized data** - All dummy data in one file  
✅ **Type-safe** - Mock data uses same TypeScript interfaces  
✅ **Realistic** - Simulates network delays  
✅ **No backend required** - Develop UI independently  
✅ **Easy testing** - Test with consistent data  

## Adding New Mock Data

### 1. Define Mock Data

Add your mock data to `mockData.ts`:

```typescript
export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Food', icon: 'FaUtensils', color: '#FF6384' },
  // ... more categories
];
```

### 2. Add to Mock Service

Add function to `mockDataService`:

```typescript
export const mockDataService = {
  // ... existing functions
  
  async fetchCategories(): Promise<Category[]> {
    await delay(MOCK_DELAY);
    return mockCategories;
  },
};
```

### 3. Update Service

Add flag check to your service:

```typescript
// categoryService.ts
async fetchCategories(): Promise<Category[]> {
  if (USE_MOCK_DATA) {
    return mockDataService.fetchCategories();
  }
  const response = await api.get('/categories');
  return response.data;
}
```

## Troubleshooting

### Issue: Data not loading

**Solution:** Check browser console for errors. Make sure `USE_MOCK_DATA = true` in `mockData.ts`

### Issue: Data loads too slowly

**Solution:** Reduce `MOCK_DELAY` value in `mockData.ts`

### Issue: 404 errors still appearing

**Solution:** Ensure `USE_MOCK_DATA = true` and rebuild with `npm run build`

### Issue: Mock data not updating

**Solution:** 
1. Save changes to `mockData.ts`
2. Restart dev server
3. Hard refresh browser (Ctrl+Shift+R)

## Best Practices

1. **Keep mock data realistic** - Use real-world values and scenarios
2. **Update when API changes** - Keep mock data structure matching real API
3. **Document changes** - Add comments when adding new mock data
4. **Use TypeScript** - Leverage type checking for mock data
5. **Test both modes** - Test with mock data AND real API before deployment

## File Structure

```
src/services/
├── mockData.ts ................. Centralized mock data + flag
├── api.ts ...................... Axios client for real API
├── accountService.ts ........... Account API + mock data check
├── analyticsService.ts ......... Analytics API + mock data check
├── budgetService.ts ............ Budget API + mock data check
├── transactionService.ts ....... Transaction API + mock data check
└── README_MOCK_DATA.md ......... This file
```

## Next Steps

When your backend is ready:

1. **Switch flag**: Set `USE_MOCK_DATA = false` in `mockData.ts`
2. **Test endpoints**: Verify all API endpoints work
3. **Remove mock data** (optional): Delete mock data after production is stable
4. **Update docs**: Document any API differences

---

**Remember**: The entire app can work without a backend by keeping `USE_MOCK_DATA = true`!
