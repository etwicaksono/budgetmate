import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBalanceAPI() {
  try {
    // Get user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No user found');
      return;
    }

    console.log(`Testing for user: ${user.username} (${user.id})\n`);

    // Date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

    // Fetch accounts with initial balances per currency
    const accounts = await prisma.account.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        is_included_in_total: true,
      },
      select: {
        currency: true,
        initial_balance: true,
      },
    });

    const initialBalances = new Map<string, number>();
    for (const account of accounts) {
      const currency = account.currency || 'USD';
      const current = initialBalances.get(currency) || 0;
      initialBalances.set(currency, current + Number(account.initial_balance));
    }

    console.log('=== INITIAL BALANCES PER CURRENCY ===');
    for (const [currency, balance] of initialBalances.entries()) {
      console.log(`${currency}: ${balance}`);
    }
    console.log('');

    // Fetch transactions
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
        currency: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`=== TRANSACTIONS (${transactions.length} found) ===`);
    for (const tx of transactions) {
      console.log(`${tx.date.toISOString().split('T')[0]} | ${tx.type} | ${tx.currency} ${tx.amount}`);
    }
    console.log('');

    // Group transactions by date and currency (daily)
    const groupedData = new Map<string, Map<string, number>>();
    const currencies = new Set<string>();

    // Add currencies from initial balances
    initialBalances.forEach((_, currency) => currencies.add(currency));

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const key = date.toISOString().split('T')[0]!;
      const currency = transaction.currency || 'USD';
      currencies.add(currency);

      if (!groupedData.has(key)) {
        groupedData.set(key, new Map());
      }

      const periodData = groupedData.get(key)!;
      const current = periodData.get(currency) || 0;

      // Note: Amounts are already signed in database (income: +, expense: -)
      const amount = Number(transaction.amount);
      periodData.set(currency, current + amount);
    }

    const labels = Array.from(groupedData.keys()).sort();
    const currencyList = Array.from(currencies).sort();

    console.log('=== CALCULATING CUMULATIVE BALANCE PER CURRENCY ===\n');

    const cumulativeBalances = new Map<string, number>();

    // Initialize with initial balances
    currencyList.forEach(currency => {
      const initialBalance = initialBalances.get(currency) || 0;
      cumulativeBalances.set(currency, initialBalance);
      console.log(`${currency} starting balance: ${initialBalance}`);
    });
    console.log('');

    // Calculate cumulative for each date
    if (labels.length > 0) {
      for (const label of labels) {
        const periodData = groupedData.get(label)!;

        console.log(`Date: ${label}`);
        currencyList.forEach(currency => {
          const currentCumulative = cumulativeBalances.get(currency) || 0;
          const periodChange = periodData.get(currency) || 0;
          const newCumulative = currentCumulative + periodChange;

          if (periodChange !== 0) {
            console.log(`  ${currency}: ${currentCumulative} + ${periodChange} = ${newCumulative}`);
          }

          cumulativeBalances.set(currency, newCumulative);
          periodData.set(currency, newCumulative);
        });
        console.log('');
      }
    }

    console.log('=== FINAL BALANCES ===');
    for (const [currency, balance] of cumulativeBalances.entries()) {
      console.log(`${currency}: ${balance}`);
    }
    console.log('');

    // Show what the API would return
    console.log('=== API RESPONSE FORMAT ===');
    const datasets = currencyList.map(currency => ({
      label: currency,
      data: labels.map(label => {
        const periodData = groupedData.get(label);
        return periodData?.get(currency) || 0;
      }),
    }));

    console.log(JSON.stringify({
      labels,
      datasets,
      currencies: currencyList,
    }, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBalanceAPI();
