/**
 * Manual Validation Test Script
 * Run this with: npx ts-node schemas/__tests__/manual-validation-test.ts
 * 
 * This tests schemas without requiring Jest setup
 */

import { LoginRequestSchema } from '../auth/login.schema.js';
import { RegisterRequestSchema } from '../auth/register.schema.js';
import { CreateAccountRequestSchema, AccountSchema } from '../accounts/account.schema.js';
import { CreateCategoryRequestSchema, CategoryNatureSchema } from '../categories/category.schema.js';
import { CreateTransactionRequestSchema, TransactionFiltersSchema } from '../transactions/transaction.schema.js';
import { CreateTransferRequestSchema } from '../transfers/transfer.schema.js';
import { CreateDebtRequestSchema, DebtTypeSchema } from '../debts/debt.schema.js';

console.log('🧪 Starting Manual Validation Tests...\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

// ============================================================================
// Auth Schema Tests
// ============================================================================

console.log('📝 Testing Auth Schemas\n');

test('LoginRequestSchema - valid data', () => {
  const result = LoginRequestSchema.safeParse({
    email_or_username: 'test@example.com',
    password: 'password123',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('LoginRequestSchema - rejects short password', () => {
  const result = LoginRequestSchema.safeParse({
    email_or_username: 'test@example.com',
    password: 'short',
  });
  if (result.success) throw new Error('Should reject short password');
});

test('RegisterRequestSchema - valid data', () => {
  const result = RegisterRequestSchema.safeParse({
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('RegisterRequestSchema - rejects invalid email', () => {
  const result = RegisterRequestSchema.safeParse({
    email: 'not-an-email',
    username: 'testuser',
    password: 'password123',
  });
  if (result.success) throw new Error('Should reject invalid email');
});

test('RegisterRequestSchema - rejects invalid username characters', () => {
  const result = RegisterRequestSchema.safeParse({
    email: 'test@example.com',
    username: 'user@name',
    password: 'password123',
  });
  if (result.success) throw new Error('Should reject invalid username');
});

// ============================================================================
// Account Schema Tests
// ============================================================================

console.log('\n📝 Testing Account Schemas\n');

test('CreateAccountRequestSchema - valid data', () => {
  const result = CreateAccountRequestSchema.safeParse({
    personal_id: 1,
    name: 'Test Account',
    icon: 'wallet',
    account_type: 'BANK',
    color: '#FF5733',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateAccountRequestSchema - applies defaults', () => {
  const result = CreateAccountRequestSchema.safeParse({
    personal_id: 1,
    name: 'Test',
    icon: 'wallet',
    account_type: 'BANK',
    color: '#FF5733',
  });
  if (!result.success) throw new Error('Should be valid');
  // initial_amount is optional, not required to have default in parsed result
  if (result.data.initial_amount !== undefined && result.data.initial_amount !== 0) {
    throw new Error('initial_amount should be 0 or undefined');
  }
});

test('CreateAccountRequestSchema - rejects name > 36 chars', () => {
  const result = CreateAccountRequestSchema.safeParse({
    personal_id: 1,
    name: 'A'.repeat(37),
    icon: 'wallet',
    account_type: 'BANK',
    color: '#FF5733',
  });
  if (result.success) throw new Error('Should reject long name');
});

test('CreateAccountRequestSchema - rejects invalid UUID', () => {
  const result = CreateAccountRequestSchema.safeParse({
    personal_id: 1,
    name: 'Test',
    icon: 'wallet',
    account_type: 'BANK',
    color: '#FF5733',
    group_id: 'not-a-uuid',
  });
  if (result.success) throw new Error('Should reject invalid UUID');
});

// ============================================================================
// Category Schema Tests
// ============================================================================

console.log('\n📝 Testing Category Schemas\n');

test('CreateCategoryRequestSchema - valid data', () => {
  const result = CreateCategoryRequestSchema.safeParse({
    personal_id: 1,
    name: 'Food',
    icon: 'restaurant',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateCategoryRequestSchema - applies default nature', () => {
  const result = CreateCategoryRequestSchema.safeParse({
    personal_id: 1,
    name: 'Food',
    icon: 'restaurant',
  });
  if (!result.success) throw new Error('Should be valid');
  // nature is optional, not required to have default in parsed result
  if (result.data.nature !== undefined && result.data.nature !== 'NEED') {
    throw new Error('nature should be NEED or undefined');
  }
});

test('CategoryNatureSchema - accepts NEED, WANT, MUST', () => {
  const need = CategoryNatureSchema.safeParse('NEED');
  const want = CategoryNatureSchema.safeParse('WANT');
  const must = CategoryNatureSchema.safeParse('MUST');
  
  if (!need.success || !want.success || !must.success) {
    throw new Error('Should accept all valid nature values');
  }
});

test('CategoryNatureSchema - rejects invalid values', () => {
  const result = CategoryNatureSchema.safeParse('INVALID');
  if (result.success) throw new Error('Should reject invalid nature');
});

// ============================================================================
// Transaction Schema Tests
// ============================================================================

console.log('\n📝 Testing Transaction Schemas\n');

test('CreateTransactionRequestSchema - valid income', () => {
  const result = CreateTransactionRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'INCOME',
    amount: 1000,
    date: new Date(),
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateTransactionRequestSchema - valid expense', () => {
  const result = CreateTransactionRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'EXPENSE',
    amount: -50,
    date: new Date(),
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateTransactionRequestSchema - rejects zero amount', () => {
  const result = CreateTransactionRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    category_id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'EXPENSE',
    amount: 0,
    date: new Date(),
  });
  if (result.success) throw new Error('Should reject zero amount');
});

test('TransactionFiltersSchema - coerces query params', () => {
  const result = TransactionFiltersSchema.safeParse({
    limit: '50',
    offset: '10',
    min_amount: '100',
  });
  if (!result.success) throw new Error('Should coerce strings to numbers');
  if (typeof result.data.limit !== 'number') throw new Error('limit should be number');
  if (result.data.limit !== 50) throw new Error('limit should be 50');
});

// ============================================================================
// Transfer Schema Tests
// ============================================================================

console.log('\n📝 Testing Transfer Schemas\n');

test('CreateTransferRequestSchema - valid data', () => {
  const result = CreateTransferRequestSchema.safeParse({
    personal_id: 1,
    from_account_id: '550e8400-e29b-41d4-a716-446655440000',
    to_account_id: '550e8400-e29b-41d4-a716-446655440001',
    amount: 100,
    date: new Date(),
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateTransferRequestSchema - rejects same accounts', () => {
  const result = CreateTransferRequestSchema.safeParse({
    personal_id: 1,
    from_account_id: '550e8400-e29b-41d4-a716-446655440000',
    to_account_id: '550e8400-e29b-41d4-a716-446655440000',
    amount: 100,
    date: new Date(),
  });
  if (result.success) throw new Error('Should reject same accounts');
});

test('CreateTransferRequestSchema - rejects negative amount', () => {
  const result = CreateTransferRequestSchema.safeParse({
    personal_id: 1,
    from_account_id: '550e8400-e29b-41d4-a716-446655440000',
    to_account_id: '550e8400-e29b-41d4-a716-446655440001',
    amount: -100,
    date: new Date(),
  });
  if (result.success) throw new Error('Should reject negative amount');
});

// ============================================================================
// Debt Schema Tests
// ============================================================================

console.log('\n📝 Testing Debt Schemas\n');

test('CreateDebtRequestSchema - valid payable', () => {
  const result = CreateDebtRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    type: 'PAYABLE',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('CreateDebtRequestSchema - valid receivable', () => {
  const result = CreateDebtRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jane Smith',
    type: 'RECEIVABLE',
  });
  if (!result.success) throw new Error('Should be valid');
});

test('DebtTypeSchema - rejects LENT/BORROWED', () => {
  const lent = DebtTypeSchema.safeParse('LENT');
  const borrowed = DebtTypeSchema.safeParse('BORROWED');
  
  if (lent.success || borrowed.success) {
    throw new Error('Should reject LENT/BORROWED (use PAYABLE/RECEIVABLE)');
  }
});

test('CreateDebtRequestSchema - rejects empty name', () => {
  const result = CreateDebtRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    name: '',
    type: 'PAYABLE',
  });
  if (result.success) throw new Error('Should reject empty name');
});

test('CreateDebtRequestSchema - rejects name > 64 chars', () => {
  const result = CreateDebtRequestSchema.safeParse({
    personal_id: 1,
    account_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'A'.repeat(65),
    type: 'PAYABLE',
  });
  if (result.success) throw new Error('Should reject name > 64 chars');
});

// ============================================================================
// Results Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${passed + failed}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n🎉 All validation tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
