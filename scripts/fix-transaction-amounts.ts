/**
 * Fix Transaction Amount Signs
 * 
 * This script fixes transactions that have incorrect amount signs
 * according to Document 09: Critical Implementation Rules
 * 
 * CRITICAL CONVENTION:
 * - EXPENSE transactions MUST have NEGATIVE amounts
 * - INCOME transactions MUST have POSITIVE amounts
 * - TRANSFER_OUT transactions MUST have NEGATIVE amounts
 * - TRANSFER_IN transactions MUST have POSITIVE amounts
 */

import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  type: string;
  totalCount: number;
  negativeCount: number;
  positiveCount: number;
  zeroCount: number;
  isValid: boolean;
}

async function checkCurrentState(): Promise<ValidationResult[]> {
  console.log('\n📊 Checking current state...\n');

  const types: TransactionType[] = [
    TransactionType.expense,
    TransactionType.income,
    TransactionType.transfer_out,
    TransactionType.transfer_in
  ];
  const results: ValidationResult[] = [];

  for (const type of types) {
    const transactions = await prisma.transaction.findMany({
      where: {
        type,
        deleted_at: null
      },
      select: {
        amount: true
      }
    });

    const totalCount = transactions.length;
    const negativeCount = transactions.filter(t => t.amount.toNumber() < 0).length;
    const positiveCount = transactions.filter(t => t.amount.toNumber() > 0).length;
    const zeroCount = transactions.filter(t => t.amount.toNumber() === 0).length;

    // Determine if this type is valid
    const isValid =
      (type === 'expense' || type === 'transfer_out')
        ? positiveCount === 0  // All should be negative
        : negativeCount === 0; // All should be positive

    results.push({
      type,
      totalCount,
      negativeCount,
      positiveCount,
      zeroCount,
      isValid
    });

    const statusIcon = isValid ? '✅' : '❌';
    console.log(`${statusIcon} ${type.toUpperCase()}: ${totalCount} total`);
    console.log(`   Negative: ${negativeCount}, Positive: ${positiveCount}, Zero: ${zeroCount}`);
  }

  return results;
}

async function fixExpenseTransactions(): Promise<number> {
  // Fix EXPENSE transactions with POSITIVE amounts
  const result = await prisma.$executeRaw`
    UPDATE "Transaction"
    SET 
      amount = -ABS(amount::numeric),
      updated_at = NOW(),
      updated_by = COALESCE(updated_by, created_by, user_id)
    WHERE 
      type = 'expense'
      AND amount > 0
      AND deleted_at IS NULL
  `;

  return Number(result);
}

async function fixIncomeTransactions(): Promise<number> {
  // Fix INCOME transactions with NEGATIVE amounts
  const result = await prisma.$executeRaw`
    UPDATE "Transaction"
    SET 
      amount = ABS(amount::numeric),
      updated_at = NOW(),
      updated_by = COALESCE(updated_by, created_by, user_id)
    WHERE 
      type = 'income'
      AND amount < 0
      AND deleted_at IS NULL
  `;

  return Number(result);
}

async function fixTransferOutTransactions(): Promise<number> {
  // Fix TRANSFER_OUT transactions with POSITIVE amounts
  const result = await prisma.$executeRaw`
    UPDATE "Transaction"
    SET 
      amount = -ABS(amount::numeric),
      updated_at = NOW(),
      updated_by = COALESCE(updated_by, created_by, user_id)
    WHERE 
      type = 'transfer_out'
      AND amount > 0
      AND deleted_at IS NULL
  `;

  return Number(result);
}

async function fixTransferInTransactions(): Promise<number> {
  // Fix TRANSFER_IN transactions with NEGATIVE amounts
  const result = await prisma.$executeRaw`
    UPDATE "Transaction"
    SET 
      amount = ABS(amount::numeric),
      updated_at = NOW(),
      updated_by = COALESCE(updated_by, created_by, user_id)
    WHERE 
      type = 'transfer_in'
      AND amount < 0
      AND deleted_at IS NULL
  `;

  return Number(result);
}

async function main() {
  console.log('🔧 Transaction Amount Sign Fixer');
  console.log('================================\n');

  try {
    // 1. Check current state
    const beforeState = await checkCurrentState();
    const hasIssues = beforeState.some(r => !r.isValid);

    if (!hasIssues) {
      console.log('\n✅ All transactions have correct amount signs. No fixes needed!\n');
      return;
    }

    console.log('\n⚠️  Issues detected. Starting fixes...\n');

    // 2. Apply fixes
    const expenseFixed = await fixExpenseTransactions();
    console.log(`✅ Fixed ${expenseFixed} EXPENSE transactions`);

    const incomeFixed = await fixIncomeTransactions();
    console.log(`✅ Fixed ${incomeFixed} INCOME transactions`);

    const transferOutFixed = await fixTransferOutTransactions();
    console.log(`✅ Fixed ${transferOutFixed} TRANSFER_OUT transactions`);

    const transferInFixed = await fixTransferInTransactions();
    console.log(`✅ Fixed ${transferInFixed} TRANSFER_IN transactions`);

    const totalFixed = expenseFixed + incomeFixed + transferOutFixed + transferInFixed;
    console.log(`\n📊 Total transactions fixed: ${totalFixed}\n`);

    // 3. Verify the fix
    console.log('🔍 Verifying fixes...\n');
    const afterState = await checkCurrentState();
    const stillHasIssues = afterState.some(r => !r.isValid);

    if (stillHasIssues) {
      console.error('\n❌ Some issues remain after fix. Please investigate manually.\n');

      // Show remaining violations
      const violations = await prisma.transaction.findMany({
        where: {
          deleted_at: null,
          OR: [
            {
              type: { in: ['expense', 'transfer_out'] },
              amount: { gt: 0 }
            },
            {
              type: { in: ['income', 'transfer_in'] },
              amount: { lt: 0 }
            }
          ]
        },
        select: {
          id: true,
          type: true,
          amount: true,
          date: true,
          description: true
        },
        take: 10
      });

      console.log('Remaining violations (first 10):');
      console.table(violations.map(v => ({
        id: v.id.substring(0, 8),
        type: v.type,
        amount: v.amount.toNumber(),
        date: v.date.toISOString().split('T')[0],
        description: v.description?.substring(0, 30)
      })));
    } else {
      console.log('\n✅ All issues fixed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
