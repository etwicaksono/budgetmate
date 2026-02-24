import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import defaultCategories from '../src/data/default_categories.json';
import defaultAccounts from '../src/data/default_accounts.json';

const prisma = new PrismaClient();

interface CategoryData {
  name: string;
  icon: string;
  color?: string;
  nature?: string;
}

interface ParentCategoryData {
  icon: string;
  color: string;
  nature: string;
  children: CategoryData[];
}

async function createDefaultDataForUser(userId: string): Promise<Map<string, string>> {
  console.info('Creating default data for user:', userId);
  
  try {
    const categoryMap = new Map<string, string>();
    
    console.info('Creating income categories...');
    for (const category of defaultCategories.income) {
      const created = await prisma.category.create({
        data: {
          user_id: userId,
          name: category.name,
          type: 'income',
          nature: category.nature || 'WANT',
          icon: category.icon,
          color: category.color,
          is_system: true,
          is_active: true
        }
      });
      categoryMap.set(category.name, created.id);
    }
    
    // Create expense categories with hierarchy
    console.info('Creating expense categories...');
    for (const [parentName, parentData] of Object.entries(defaultCategories.expense)) {
      const data = parentData as ParentCategoryData;
      
      // Create parent category
      const parent = await prisma.category.create({
        data: {
          user_id: userId,
          name: parentName,
          type: 'expense',
          nature: data.nature || 'WANT',
          icon: data.icon,
          color: data.color,
          is_system: true,
          is_active: true
        }
      });
      
      categoryMap.set(parentName, parent.id);
      
      // Create child categories
      if (data.children) {
        for (const child of data.children) {
          const childCategory = await prisma.category.create({
            data: {
              user_id: userId,
              parent_id: parent.id,
              name: child.name,
              type: 'expense',
              nature: child.nature || data.nature || 'WANT',
              icon: child.icon,
              color: data.color, // Inherit parent color
              is_system: true,
              is_active: true
            }
          });
          categoryMap.set(`${parentName}:${child.name}`, childCategory.id);
        }
      }
    }
    
    console.info('Default categories created');
    
    // Create default accounts
    console.info('Creating default accounts...');
    for (const account of defaultAccounts) {
      await prisma.account.create({
        data: {
          user_id: userId,
          name: account.name,
          account_type: account.account_type,
          icon: account.icon,
          color: account.color,
          currency: account.currency || 'USD',
          initial_balance: account.initial_balance || 0,
          // current_balance removed - calculated on-demand
          is_active: account.is_active,
          is_included_in_total: account.is_included_in_total
        }
      });
    }
    
    console.info('Default data created successfully');
    return categoryMap;
    
  } catch (error) {
    console.error('Error creating default data:', error);
    throw error;
  }
}

async function createSampleTransactions(
  userId: string,
  accountIds: string[],
  categoryMap: Map<string, string>
): Promise<void> {
  console.info('Creating sample transactions...');
  
  const today = new Date();
  const transactions = [];
  
  // Generate transactions for the last 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    
    // Random number of transactions per day (0-3)
    const numTransactions = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numTransactions; i++) {
      const isIncome = Math.random() < 0.1; // 10% chance of income
      const type = isIncome ? 'income' : 'expense';
      
      // Select random account
      const accountId = accountIds[Math.floor(Math.random() * accountIds.length)];
      if (!accountId) {
        continue;
      }
      
      // Select appropriate category
      let categoryId: string | undefined;
      if (isIncome) {
        categoryId = categoryMap.get('Salary') || categoryMap.get('Other Income');
      } else {
        // Random expense category
        const expenseCategories = [
          'Food & Drinks:Groceries',
          'Food & Drinks:Restaurant, fast-food',
          'Shopping:Clothes & shoes',
          'Transportation:Public transport',
          'Housing:Energy, utilities',
          'Life & Entertainment:Active sport, fitness'
        ];
        const randomCategory = expenseCategories[
          Math.floor(Math.random() * expenseCategories.length)
        ];
        if (randomCategory) {
          categoryId = categoryMap.get(randomCategory);
        }
      }
      
      if (!categoryId) {
        continue;
      }
      
      const amount = isIncome
        ? Math.floor(Math.random() * 3000) + 1000 // Income: $1000-4000
        : Math.floor(Math.random() * 200) + 10;   // Expense: $10-210
      
      // Skip if we don't have all required data
      if (!categoryId || !accountId) {
        continue;
      }
      
      transactions.push({
        user_id: userId,
        account_id: accountId,
        category_id: categoryId,
        type: type,
        amount: type === 'expense' ? -amount : amount, // Negative for expenses
        currency: 'USD',
        date: date,
        description: `Sample ${type} transaction`,
        payment_method: 'Cash',
        payment_status: 'Cleared'
      });
    }
  }
  
  // Create transactions in database
  for (const transaction of transactions) {
    await prisma.transaction.create({ data: transaction });
    
    // ✅ Balance now calculated on-demand, no need to update
  }
  
  console.info(`Created ${transactions.length} sample transactions`);
}

async function main(): Promise<void> {
  console.info('Starting database seed...');
  
  try {
    // Check if demo user exists
    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    });
    
    if (!demoUser) {
      // Create demo user
      console.info('Creating demo user...');
      const hashedPassword = await bcrypt.hash('demo123456', 10);
      
      demoUser = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          username: 'demo',
          password_hash: hashedPassword,
          full_name: 'Demo User',
          email_verified: true,
          timezone: 'UTC',
          currency: 'USD'
        }
      });
    }
    
    // Check if user already has data
    const existingCategories = await prisma.category.count({
      where: { user_id: demoUser.id }
    });
    
    if (existingCategories > 0) {
      console.info('User already has categories, skipping seed...');
      return;
    }
    
    // Create default data
    const categoryMap = await createDefaultDataForUser(demoUser.id);
    
    // Get created accounts
    const accounts = await prisma.account.findMany({
      where: { user_id: demoUser.id }
    });
    
    // Create sample transactions
    await createSampleTransactions(
      demoUser.id,
      accounts.map(a => a.id),
      categoryMap
    );
    
    console.info('Seed completed successfully!');
    console.info('Demo credentials:');
    console.info('Email: demo@example.com');
    console.info('Password: demo123456');
    
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
