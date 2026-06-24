import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBalanceAPI() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No user found');
      return;
    }

    console.log(`Testing for user: ${user.username} (${user.id})\n`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

    const accounts = await prisma.account.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        is_included_in_total: true,
      },
      select: {
        initial_balance: true,
      },
    });

    const initialBalance = accounts.reduce(
      (sum, account) => sum + Number(account.initial_balance),
      0
    );

    console.log('=== INITIAL BALANCE ===');
    console.log(initialBalance);
    console.log('');

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`=== TRANSACTIONS (${transactions.length} found) ===`);
    for (const tx of transactions) {
      console.log(`${tx.date.toISOString().split('T')[0]} | ${tx.type} | IDR ${tx.amount}`);
    }
    console.log('');

    const dailyChanges = new Map<string, number>();
    for (const transaction of transactions) {
      const key = transaction.date.toISOString().split('T')[0]!;
      const current = dailyChanges.get(key) || 0;
      dailyChanges.set(key, current + Number(transaction.amount));
    }

    const labels = Array.from(dailyChanges.keys()).sort();
    const data = labels.map((label) => dailyChanges.get(label) || 0);

    const transactionChange = data.reduce((sum, value) => sum + value, 0);
    const endingBalance = initialBalance + transactionChange;

    console.log('=== CUMULATIVE BALANCE ===');
    console.log(`Starting balance: ${initialBalance}`);
    for (const label of labels) {
      const change = dailyChanges.get(label) || 0;
      console.log(`${label}: ${change >= 0 ? '+' : ''}${change}`);
    }
    console.log('');

    console.log('=== FINAL BALANCES ===');
    console.log(`Transaction change: ${transactionChange}`);
    console.log(`Ending balance: ${endingBalance}`);
    console.log('');

    console.log('=== API RESPONSE FORMAT ===');
    console.log(JSON.stringify({
      labels,
      datasets: [
        {
          label: 'Balance',
          data,
        },
      ],
      total: endingBalance,
    }, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBalanceAPI();
