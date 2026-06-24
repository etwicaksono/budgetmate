import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTransactionAmounts() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        date: true,
        type: true,
        amount: true,
        description: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    console.log('=== RECENT TRANSACTIONS ===\n');
    for (const tx of transactions) {
      console.log(`ID: ${tx.id}`);
      console.log(`Date: ${tx.date.toISOString().split('T')[0]}`);
      console.log(`Type: ${tx.type}`);
      console.log(`Amount: ${tx.amount} (typeof: ${typeof tx.amount})`);
      console.log('Currency: IDR');
      console.log(`Description: ${tx.description || 'N/A'}`);
      console.log(`Amount as Number: ${Number(tx.amount)}`);
      console.log(`Is negative: ${Number(tx.amount) < 0}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactionAmounts();
