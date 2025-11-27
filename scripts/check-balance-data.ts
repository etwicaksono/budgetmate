import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBalanceData() {
  try {
    console.log('=== CHECKING ACCOUNTS ===\n');
    
    const accounts = await prisma.account.findMany({
      where: {
        deleted_at: null,
        is_included_in_total: true,
      },
      select: {
        id: true,
        name: true,
        currency: true,
        initial_balance: true,
        user_id: true,
      },
      orderBy: [
        { currency: 'asc' },
        { name: 'asc' },
      ],
    });

    console.log(`Found ${accounts.length} accounts:\n`);
    
    const currencyTotals = new Map<string, { initial: number; count: number }>();
    
    for (const account of accounts) {
      console.log(`- ${account.name}`);
      console.log(`  Currency: ${account.currency}`);
      console.log(`  Initial Balance: ${account.initial_balance}`);
      console.log(`  User ID: ${account.user_id}`);
      console.log('');
      
      const currency = account.currency || 'USD';
      const existing = currencyTotals.get(currency) || { initial: 0, count: 0 };
      
      currencyTotals.set(currency, {
        initial: existing.initial + Number(account.initial_balance),
        count: existing.count + 1,
      });
    }
    
    console.log('\n=== TOTALS BY CURRENCY ===\n');
    for (const [currency, totals] of currencyTotals.entries()) {
      console.log(`${currency}:`);
      console.log(`  Accounts: ${totals.count}`);
      console.log(`  Total Initial Balance: ${totals.initial}`);
      console.log('');
    }
    
    console.log('\n=== CHECKING TRANSACTIONS (last 30 days) ===\n');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const transactions = await prisma.transaction.findMany({
      where: {
        deleted_at: null,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        date: true,
        type: true,
        amount: true,
        currency: true,
        description: true,
        user_id: true,
      },
      orderBy: [
        { date: 'asc' },
        { currency: 'asc' },
      ],
      take: 50, // Limit to 50 for readability
    });
    
    console.log(`Found ${transactions.length} transactions in last 30 days:\n`);
    
    const transactionsByCurrency = new Map<string, number>();
    
    for (const tx of transactions) {
      console.log(`- ${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.currency} ${tx.amount} | ${tx.description || 'No description'}`);
      
      const currency = tx.currency || 'USD';
      transactionsByCurrency.set(currency, (transactionsByCurrency.get(currency) || 0) + 1);
    }
    
    console.log('\n=== TRANSACTION COUNT BY CURRENCY ===\n');
    for (const [currency, count] of transactionsByCurrency.entries()) {
      console.log(`${currency}: ${count} transactions`);
    }
    
    // Check for currencies with accounts but no transactions
    console.log('\n=== CURRENCIES WITH ACCOUNTS BUT NO TRANSACTIONS ===\n');
    for (const currency of currencyTotals.keys()) {
      if (!transactionsByCurrency.has(currency)) {
        console.log(`⚠️  ${currency}: Has ${currencyTotals.get(currency)?.count} account(s) but NO transactions in last 30 days`);
      }
    }
    
  } catch (error) {
    console.error('Error checking balance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalanceData();
