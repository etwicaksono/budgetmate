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
        initial_balance: true,
        user_id: true,
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    const totalInitialBalance = accounts.reduce(
      (sum, account) => sum + Number(account.initial_balance),
      0
    );

    console.log(`Found ${accounts.length} accounts`);
    console.log(`Total initial balance: ${totalInitialBalance}`);
    console.log('');

    console.log('=== CHECKING TRANSACTIONS (last 30 days) ===\n');

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
        description: true,
        user_id: true,
      },
      orderBy: [
        { date: 'asc' },
      ],
      take: 50,
    });

    const totalTransactionAmount = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );

    console.log(`Found ${transactions.length} transactions in last 30 days`);
    console.log(`Net transaction amount: ${totalTransactionAmount}`);
    console.log('');

    const endingBalance = totalInitialBalance + totalTransactionAmount;

    console.log('=== OVERALL TOTALS ===');
    console.log(`Initial balance: ${totalInitialBalance}`);
    console.log(`Transaction change: ${totalTransactionAmount}`);
    console.log(`Ending balance: ${endingBalance}`);
  } catch (error) {
    console.error('Error checking balance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalanceData();
