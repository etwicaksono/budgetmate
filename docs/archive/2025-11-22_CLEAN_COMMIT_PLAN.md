# Clean Commit History Plan

## Current State: 18 commits (includes 4 debug commits)

## Proposed Clean History: 9 commits

### 1. refactor: migrate to calculated balance architecture
- Add database index
- Create BalanceService
- Update API routes to use calculated balances
- Remove balance management from transactions/transfers
- **Squash:** 72ef7e2

### 2. fix: delete both transfer transactions when deleting a transfer
- Detect transfer_id and delete entire transfer
- **Keep:** 9b7bc24

### 3. refactor: remove current_balance column from database
- Drop column from schema
- Remove from account creation/updates
- Clean up seed script
- **Keep:** 49d9b22

### 4. feat: implement transfer update endpoint with multi-currency support
- Add PUT /api/v1/transfers/:id
- Validate accounts and prevent same-account transfers
- Update transfer and linked transactions atomically
- Handle multi-currency transfers
- Fix to_amount for transfer_in transactions
- **Squash:** 69b15f9, 88fa10e, 807bd10

### 5. fix: transfer edit frontend payload handling
- Only include fields with valid values (no empty strings)
- Use transfer_id instead of transaction ID
- Handle multi-currency to_amount correctly
- **Squash:** 4e7840a, 79f1872, d424e88, 0f58ddf, 07528c0

### 6. fix: include transfer fields in TransactionModal edit mode
- Add to_account_id, to_amount, to_currency to edit mode
- Previously only included for create mode
- **Squash:** 9fd2c1a, 84cffbe

### 7. fix: correct transfer_in data transformation in API
- Return source amount in to_amount for transfer_in
- Swap values for proper modal display
- **Squash:** 807bd10 (already in commit 4)

Debug commits to remove:
- 1af96e0, 2f25b41, b8c85f0, e1a1afe, 51fb53e

## Strategy

Option A: Interactive rebase (advanced)
Option B: Soft reset and recommit (simpler)
Option C: Keep as-is and document the journey (transparent)

Recommendation: Option C - The debug commits show the problem-solving process
and could be valuable for learning. Just document it well.
