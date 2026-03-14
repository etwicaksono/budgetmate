# 07. Default Data Seeding

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check default data seeding checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#default-data-seeding)
4. 🧪 Write seeding tests as per [Document 14](./14_TESTING_REQUIREMENTS.md)

## 📊 Default Categories and Accounts for New Users

When a new user registers, the system automatically creates 70+ categories and 3 default accounts. This ensures users can start tracking finances immediately without manual setup.

## 🗂️ Default Categories Structure

Create `src/data/default_categories.json`:

```json
{
  "income": [
    {
      "name": "Salary",
      "icon": "FaBriefcase",
      "color": "#10b981",
      "nature": "MUST"
    },
    {
      "name": "Freelance",
      "icon": "FaLaptop",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Investments",
      "icon": "FaChartLine",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Rental Income",
      "icon": "FaHome",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Business",
      "icon": "FaStore",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Gifts",
      "icon": "FaGift",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Refunds",
      "icon": "FaUndo",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Sale",
      "icon": "FaTag",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Dividends",
      "icon": "FaChartPie",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Interests",
      "icon": "FaPercentage",
      "color": "#10b981",
      "nature": "WANT"
    },
    {
      "name": "Other Income",
      "icon": "FaCoins",
      "color": "#10b981",
      "nature": "WANT"
    }
  ],
  "expense": {
    "Food & Drinks": {
      "icon": "FaUtensils",
      "color": "#f59e0b",
      "nature": "NEED",
      "children": [
        {
          "name": "Groceries",
          "icon": "FaShoppingCart",
          "nature": "NEED"
        },
        {
          "name": "Restaurant, fast-food",
          "icon": "FaConciergeBell",
          "nature": "WANT"
        },
        {
          "name": "Bar, cafe",
          "icon": "FaCoffee",
          "nature": "WANT"
        },
        {
          "name": "Delivery",
          "icon": "FaTruck",
          "nature": "WANT"
        }
      ]
    },
    "Shopping": {
      "icon": "FaShoppingBag",
      "color": "#ec4899",
      "nature": "WANT",
      "children": [
        {
          "name": "Clothes & shoes",
          "icon": "FaTshirt",
          "nature": "NEED"
        },
        {
          "name": "Electronics, accessories",
          "icon": "FaLaptop",
          "nature": "WANT"
        },
        {
          "name": "Home, garden",
          "icon": "FaHome",
          "nature": "NEED"
        },
        {
          "name": "Toiletry, health",
          "icon": "FaToiletPaper",
          "nature": "NEED"
        },
        {
          "name": "Kids",
          "icon": "FaBaby",
          "nature": "NEED"
        },
        {
          "name": "Pets, animals",
          "icon": "FaPaw",
          "nature": "NEED"
        },
        {
          "name": "Gifts, joy",
          "icon": "FaGift",
          "nature": "WANT"
        },
        {
          "name": "Health and beauty",
          "icon": "FaSpa",
          "nature": "WANT"
        },
        {
          "name": "Stationery, tools",
          "icon": "FaPencilAlt",
          "nature": "NEED"
        },
        {
          "name": "Books, audio, subscriptions",
          "icon": "FaBook",
          "nature": "WANT"
        },
        {
          "name": "Free time",
          "icon": "FaGamepad",
          "nature": "WANT"
        }
      ]
    },
    "Housing": {
      "icon": "FaHome",
      "color": "#8b5cf6",
      "nature": "MUST",
      "children": [
        {
          "name": "Rent",
          "icon": "FaKey",
          "nature": "MUST"
        },
        {
          "name": "Mortgage",
          "icon": "FaFileContract",
          "nature": "MUST"
        },
        {
          "name": "Energy, utilities",
          "icon": "FaBolt",
          "nature": "MUST"
        },
        {
          "name": "Maintenance, repairs",
          "icon": "FaWrench",
          "nature": "NEED"
        },
        {
          "name": "Property insurance",
          "icon": "FaShieldAlt",
          "nature": "MUST"
        },
        {
          "name": "Services",
          "icon": "FaHandshake",
          "nature": "NEED"
        }
      ]
    },
    "Transportation": {
      "icon": "FaBus",
      "color": "#6366f1",
      "nature": "NEED",
      "children": [
        {
          "name": "Public transport",
          "icon": "FaTrain",
          "nature": "NEED"
        },
        {
          "name": "Taxi",
          "icon": "FaTaxi",
          "nature": "WANT"
        },
        {
          "name": "Business trips",
          "icon": "FaSuitcase",
          "nature": "NEED"
        },
        {
          "name": "Long distance",
          "icon": "FaPlane",
          "nature": "WANT"
        }
      ]
    },
    "Vehicle": {
      "icon": "FaCar",
      "color": "#06b6d4",
      "nature": "NEED",
      "children": [
        {
          "name": "Fuel",
          "icon": "FaGasPump",
          "nature": "NEED"
        },
        {
          "name": "Parking",
          "icon": "FaParking",
          "nature": "NEED"
        },
        {
          "name": "Vehicle maintenance",
          "icon": "FaOilCan",
          "nature": "NEED"
        },
        {
          "name": "Vehicle insurance",
          "icon": "FaShieldAlt",
          "nature": "MUST"
        },
        {
          "name": "Leasing",
          "icon": "FaFileContract",
          "nature": "MUST"
        },
        {
          "name": "Rentals",
          "icon": "FaKey",
          "nature": "WANT"
        }
      ]
    },
    "Life & Entertainment": {
      "icon": "FaFilm",
      "color": "#a855f7",
      "nature": "WANT",
      "children": [
        {
          "name": "Health care, doctor",
          "icon": "FaUserMd",
          "nature": "MUST"
        },
        {
          "name": "Wellness, beauty",
          "icon": "FaSpa",
          "nature": "WANT"
        },
        {
          "name": "Active sport, fitness",
          "icon": "FaDumbbell",
          "nature": "WANT"
        },
        {
          "name": "Culture, sport events",
          "icon": "FaTicketAlt",
          "nature": "WANT"
        },
        {
          "name": "Education, development",
          "icon": "FaGraduationCap",
          "nature": "NEED"
        },
        {
          "name": "Hobbies",
          "icon": "FaPalette",
          "nature": "WANT"
        },
        {
          "name": "Holiday, trips, hotels",
          "icon": "FaUmbrellaBeach",
          "nature": "WANT"
        },
        {
          "name": "TV, Streaming",
          "icon": "FaTv",
          "nature": "WANT"
        },
        {
          "name": "Charity, gifts",
          "icon": "FaHandHoldingHeart",
          "nature": "WANT"
        },
        {
          "name": "Lottery, gambling",
          "icon": "FaDice",
          "nature": "WANT"
        },
        {
          "name": "Alcohol, tobacco",
          "icon": "FaWineGlass",
          "nature": "WANT"
        },
        {
          "name": "Books, audio, subscriptions",
          "icon": "FaBook",
          "nature": "WANT"
        },
        {
          "name": "Life events",
          "icon": "FaBirthdayCake",
          "nature": "WANT"
        }
      ]
    },
    "Communication, PC": {
      "icon": "FaPhone",
      "color": "#f97316",
      "nature": "NEED",
      "children": [
        {
          "name": "Phone, cell phone",
          "icon": "FaMobileAlt",
          "nature": "NEED"
        },
        {
          "name": "Internet",
          "icon": "FaWifi",
          "nature": "NEED"
        },
        {
          "name": "Software, apps, games",
          "icon": "FaGamepad",
          "nature": "WANT"
        },
        {
          "name": "Postal services",
          "icon": "FaEnvelope",
          "nature": "NEED"
        }
      ]
    },
    "Financial expenses": {
      "icon": "FaChartPie",
      "color": "#ef4444",
      "nature": "MUST",
      "children": [
        {
          "name": "Taxes",
          "icon": "FaFileInvoiceDollar",
          "nature": "MUST"
        },
        {
          "name": "Insurances",
          "icon": "FaShieldAlt",
          "nature": "MUST"
        },
        {
          "name": "Loan, interests",
          "icon": "FaHandHoldingUsd",
          "nature": "MUST"
        },
        {
          "name": "Charges, Fees",
          "icon": "FaMoneyCheckAlt",
          "nature": "MUST"
        },
        {
          "name": "Fines",
          "icon": "FaGavel",
          "nature": "MUST"
        },
        {
          "name": "Child Support",
          "icon": "FaBaby",
          "nature": "MUST"
        },
        {
          "name": "Advisory",
          "icon": "FaUserTie",
          "nature": "WANT"
        }
      ]
    },
    "Investments": {
      "icon": "FaChartLine",
      "color": "#14b8a6",
      "nature": "WANT",
      "children": [
        {
          "name": "Financial investments",
          "icon": "FaChartArea",
          "nature": "WANT"
        },
        {
          "name": "Savings",
          "icon": "FaPiggyBank",
          "nature": "NEED"
        },
        {
          "name": "Realty",
          "icon": "FaBuilding",
          "nature": "WANT"
        },
        {
          "name": "Collections",
          "icon": "FaGem",
          "nature": "WANT"
        },
        {
          "name": "Vehicles, chattels",
          "icon": "FaCar",
          "nature": "WANT"
        }
      ]
    },
    "Others": {
      "icon": "FaEllipsisH",
      "color": "#6b7280",
      "nature": "WANT",
      "children": [
        {
          "name": "Others",
          "icon": "FaQuestion",
          "nature": "WANT"
        },
        {
          "name": "Missing",
          "icon": "FaExclamationTriangle",
          "nature": "WANT"
        }
      ]
    }
  }
}
```

## 🏦 Default Accounts Structure

Create `src/data/default_accounts.json`:

```json
[
  {
    "personal_id": 1,
    "name": "Cash",
    "account_type": "cash",
    "icon": "FaWallet",
    "color": "#10b981",
    "currency": "USD",
    "initial_balance": 0,
    "is_active": true,
    "is_included_in_total": true
  },
  {
    "personal_id": 2,
    "name": "Checking Account",
    "account_type": "checking",
    "icon": "FaUniversity",
    "color": "#3b82f6",
    "currency": "USD",
    "initial_balance": 0,
    "is_active": true,
    "is_included_in_total": true
  },
  {
    "personal_id": 3,
    "name": "Savings Account",
    "account_type": "savings",
    "icon": "FaPiggyBank",
    "color": "#f59e0b",
    "currency": "USD",
    "initial_balance": 0,
    "is_active": true,
    "is_included_in_total": true
  }
]
```

## 🌱 Database Seeder Implementation

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import defaultCategories from '../src/data/default_categories.json';
import defaultAccounts from '../src/data/default_accounts.json';

const prisma = new PrismaClient();

async function createDefaultDataForUser(userId: string) {
  console.log('Creating default data for user:', userId);
  
  try {
    // Create default income categories
    let categoryPersonalId = 1;
    const categoryMap = new Map<string, string>();
    
    console.log('Creating income categories...');
    for (const category of defaultCategories.income) {
      const created = await prisma.category.create({
        data: {
          user_id: userId,
          personal_id: BigInt(categoryPersonalId++),
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
    console.log('Creating expense categories...');
    for (const [parentName, parentData] of Object.entries(defaultCategories.expense)) {
      // Create parent category
      const parent = await prisma.category.create({
        data: {
          user_id: userId,
          personal_id: BigInt(categoryPersonalId++),
          name: parentName,
          type: 'expense',
          nature: (parentData as any).nature || 'WANT',
          icon: (parentData as any).icon,
          color: (parentData as any).color,
          is_system: true,
          is_active: true
        }
      });
      
      categoryMap.set(parentName, parent.id);
      
      // Create child categories
      if ((parentData as any).children) {
        for (const child of (parentData as any).children) {
          const childCategory = await prisma.category.create({
            data: {
              user_id: userId,
              personal_id: BigInt(categoryPersonalId++),
              parent_id: parent.id,
              name: child.name,
              type: 'expense',
              nature: child.nature || (parentData as any).nature || 'WANT',
              icon: child.icon,
              color: (parentData as any).color, // Inherit parent color
              is_system: true,
              is_active: true
            }
          });
          categoryMap.set(`${parentName}:${child.name}`, childCategory.id);
        }
      }
    }
    
    console.log(`Created ${categoryPersonalId - 1} categories`);
    
    // Create default accounts
    console.log('Creating default accounts...');
    for (const account of defaultAccounts) {
      await prisma.account.create({
        data: {
          user_id: userId,
          personal_id: BigInt(account.personal_id),
          name: account.name,
          account_type: account.account_type,
          icon: account.icon,
          color: account.color,
          currency: account.currency || 'USD',
          initial_balance: account.initial_balance || 0,
          current_balance: account.initial_balance || 0,
          is_active: account.is_active,
          is_included_in_total: account.is_included_in_total
        }
      });
    }
    
    console.log('Default data created successfully');
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
) {
  console.log('Creating sample transactions...');
  
  const today = new Date();
  const transactions = [];
  let personalId = 1;
  
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
        categoryId = categoryMap.get(randomCategory);
      }
      
      if (!categoryId) continue;
      
      const amount = isIncome
        ? Math.floor(Math.random() * 3000) + 1000 // Income: $1000-4000
        : Math.floor(Math.random() * 200) + 10;   // Expense: $10-210
      
      transactions.push({
        user_id: userId,
        personal_id: BigInt(personalId++),
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
    
    // Update account balance
    await prisma.account.update({
      where: { id: transaction.account_id },
      data: {
        current_balance: {
          increment: transaction.amount
        }
      }
    });
  }
  
  console.log(`Created ${transactions.length} sample transactions`);
}

async function main() {
  console.log('Starting database seed...');
  
  try {
    // Check if demo user exists
    let demoUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    });
    
    if (!demoUser) {
      // Create demo user
      console.log('Creating demo user...');
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
      console.log('User already has categories, skipping seed...');
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
    
    console.log('Seed completed successfully!');
    console.log('Demo credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: demo123456');
    
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
```

## 🎯 Running the Seeder

### Package.json Configuration

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset",
    "db:reset:seed": "prisma migrate reset && prisma db seed"
  }
}
```

### Commands

```bash
# Run seeder only
npm run db:seed

# Reset database and seed
npm run db:reset:seed

# Reset without seeding
npm run db:reset
```

## 📊 Seeding Statistics

When seeding completes, the system creates:

### Categories (70+ total)
- **11 Income Categories**: Direct income types
- **10 Parent Expense Categories**: Major expense groups
- **50+ Child Expense Categories**: Specific expense types

### Accounts (3 default)
- Cash wallet for daily expenses
- Checking account for regular banking
- Savings account for savings tracking

### Sample Transactions (Optional)
- 30 days of transaction history
- Mixed income and expenses
- Realistic amounts and patterns

## ⚠️ Important Seeding Notes

### 1. Personal ID Assignment
```typescript
// Categories get sequential personal_ids
let categoryPersonalId = 1; // Starts at 1
categoryPersonalId++ // Increments for each category

// Accounts have fixed personal_ids
Cash: 1
Checking: 2
Savings: 3
```

### 2. Category Hierarchy
```typescript
// Parent categories created first
const parent = await prisma.category.create({...})

// Children reference parent.id
await prisma.category.create({
  parent_id: parent.id,
  color: parent.color, // Inherit color
  ...
})
```

### 3. Amount Convention
```typescript
// ALWAYS follow this rule
amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
// Expenses: NEGATIVE
// Income: POSITIVE
```

### 4. System Categories
```typescript
is_system: true // Marks as default category
// Helps differentiate from user-created categories
```

## ✅ Seeding Checklist

- [ ] Default categories JSON created
- [ ] Default accounts JSON created
- [ ] Seed script implemented
- [ ] Package.json scripts configured
- [ ] Demo user creation included
- [ ] Sample transactions generation
- [ ] Personal ID sequencing correct
- [ ] Category hierarchy maintained
- [ ] Amount signs correct
- [ ] Account balances updated

## 🎯 Next Steps

1. Run database migrations first
2. Execute seeder for demo data
3. Test with demo credentials
4. Verify all categories created
5. Check account balances
