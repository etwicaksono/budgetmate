## **1\. Introduction**

This document outlines the product requirements for a new personal finance web application. The application will provide users with a comprehensive platform to track their income and expenses, manage budgets, and gain insights into their financial health. The target audience is individuals who want to take control of their finances, save money, and make informed financial decisions. The application is designed to be user-friendly, intuitive, and visually appealing.

### **1.1. Project Vision**

To create a market-leading personal finance application that empowers users to achieve their financial goals through powerful, yet easy-to-use, financial management tools.

### **1.2. Target Audience**

* Tech-savvy millennials and Gen Z who are comfortable with digital financial tools.  
* Individuals and families who want to create and stick to a budget.  
* Anyone who wants a clear overview of their financial situation in one place.

## **2\. Core Features (MVP)**

The Minimum Viable Product (MVP) will focus on the essential features that allow users to manage their day-to-day finances.

### **2.1. User Authentication**

* **Secure Sign-up and Login:** Users can create an account using their email and password or through third-party authentication services like Google, Apple, and Facebook.  
* **Password Recovery:** A secure process for users to reset their password.

### **2.2. Dashboard**

* **Accounts-Centric Overview:** The primary view will be a grid of colorful cards, with each card representing a user's account (e.g., Cash, Bank Account, Digital Wallet).  
  * Each account card will display the account name, an icon, and the current balance.  
  * A dedicated card will allow users to "+ Add Account" directly from the dashboard via a modal form.  
* **Customizable Widgets/Cards:** Below the accounts grid, users can add, remove, and arrange various cards to personalize their dashboard view for a selected time period (e.g., "This Month"). These cards can include:  
  * A pie chart of expenses by category.  
  * A bar chart showing income vs. expenses.  
  * A line chart for cash flow analysis.
  * A list of recent transactions.  
  * A summary of budget status.

### **2.3. Transaction Management**

* **Manual Transaction Entry:** Users can manually add income and expense transactions with the following details:  
  * Amount  
  * Date  
  * Category (e.g., Food, Transport, Salary)  
  * Account (e.g., Cash, Bank Account, Credit Card)  
  * Notes  
* **Transaction Categories:** A default set of categories will be provided, but users can add, edit, or delete categories to suit their needs.  
  * **Category Input Field Behavior:** The category input field will provide an auto-suggest dropdown as users type, showing matching existing categories. Users can select from the suggestions or create a new category by typing a unique name and pressing Enter or clicking a "Create New" button. The field will include validation to prevent duplicate category names and ensure the category name is not empty. When creating new categories, users can assign a color and icon for visual identification in transaction lists and reports.
* **Transaction History:** A searchable and filterable list of all transactions.

### **2.4. Budgeting**

* **Create Budgets:** Users can create monthly, weekly, or custom period budgets for specific categories.  
* **Budget Tracking:** Visual indicators (e.g., progress bars) to show how much of the budget has been spent.  
* **Budget Status Visualization:** Cards showing remaining budget amounts and percentage used with color-coded status indicators.

### **2.5. Accounts Management**

* **Add and Manage Accounts:** Users can add various types of accounts, including:  
  * Cash  
  * Bank Accounts (Checking, Savings)  
  * Credit Cards  
* **Set Initial Balance:** Users can set the starting balance for each account.  
* **Account Visualization:** Accounts displayed as colorful cards with distinct colors for easy identification.

### **2.6. Reports and Analytics**

* **Expense and Income Reports:** Charts and graphs showing spending and income patterns over time, broken down by category.  
* **Cash Flow Analysis:** A report that visualizes the user's cash flow on a monthly basis with inflow, outflow, and net values.
* **Summary Cards:** Overview cards showing total income, expenses, and net savings for the selected period.

## **3\. Post-MVP Features (Roadmap)**

These features will be considered for future releases to enhance the application's functionality.

* **Bank Account Synchronization:** Securely connect to users' bank accounts to automatically import transactions.  
* **Financial Goals:** Allow users to set and track financial goals (e.g., saving for a vacation, paying off debt).  
* **Debt Management:** Tools to help users track and manage their debts.  
* **Investment Tracking:** A feature to track the performance of investment portfolios.  
* **Mobile App:** Native mobile applications for iOS and Android.  
* **Group Sharing:** Allow users to share accounts and budgets with family members or partners.  
* **Advanced Reporting:** More detailed and customizable reports with advanced filtering and data visualization options.
* **Recurring Transactions:** Users can set up recurring transactions for regular income (e.g., salary) and expenses (e.g., rent, subscriptions).
* **Multi-Currency Support:** Users can add accounts in different currencies, with automatic conversion to their primary currency.

## **4\. Design and User Experience (UX)**

### **4.1. UI/UX Principles**

* **Clean and Modern Design:** A minimalist and visually appealing interface that is easy to navigate.  
* **Intuitive and User-Friendly:** The application should be easy for new users to understand and use without a steep learning curve.  
* **Responsive Design:** The application must be fully responsive and work seamlessly on desktops, tablets, and mobile devices. On mobile devices, the navigation transforms into a collapsible sidebar that can be toggled with a hamburger menu icon on the left side of the top navbar.
* **Data Visualization:** Use charts, graphs, and other visual elements to present financial data in an engaging and understandable way.

### **4.2. Wireframes and Mockups**

(Here you would include links to or embed wireframes and mockups of the key screens, including the Dashboard, Transactions page, Budgets page, and Reports page. For the purpose of this document, we will describe them.)

* **Dashboard:** The main section will feature a grid of colored cards, each representing a financial account with its name, icon, and balance. Below this primary grid, there will be a customizable section where users can add widgets like expense charts, income vs. expense graphs, and recent transaction lists, controlled by a date-range filter (e.g., "This month"). The layout should be clean, with clear separation between the accounts overview and the customizable widget area. An add account card allows users to add new accounts via a modal form.
* **Transactions Page:** A clean, table-based layout for the transaction list with clear calls-to-action for adding new transactions via a modal form. A filter and search bar should be easily accessible. The category input field will feature auto-suggest functionality with visual indicators for category colors and icons.
* **Budgets Page:** A card-based layout where each card represents a budget for a specific category, displaying the budget amount, amount spent, and a progress bar with color-coded status indicators.
* **Reports Page:** A dashboard-style layout with different types of reports displayed as interactive charts and graphs. Users should be able to filter reports by date range, category, and account.
* **Navigation:** On desktop, a standard top navigation bar. On mobile devices, a collapsible sidebar accessible via a hamburger menu icon on the left side of the top navbar, containing all main navigation links.

### **4.3. Color Palette and Typography**

* **Primary Color:** A calming and trustworthy blue (\#4A90E2).  
* **Secondary Colors:** A palette of greens for income (\#7ED321), reds for expenses (\#D0021B), and a neutral gray for text and backgrounds (\#F5F5F5). Use a variety of distinct colors for the account cards to make them easily distinguishable.  
* **Typography:** A clean and readable sans-serif font like Inter or Lato.

## **5\. Technical Requirements**

### **5.1. Tech Stack**

* **Frontend:** React.js with React Bootstrap for UI components and Recharts for data visualization.  
* **State Management:** React hooks for local state management.  
* **Icons:** react-icons for UI icons.
* **Navigation:** React Router for client-side routing.

### **5.2. Security**

* **Placeholder Implementation:** Current implementation includes placeholders for secure authentication and data handling. Actual implementation would include: 
  * Data Encryption: All sensitive user data must be encrypted both in transit (using SSL/TLS) and at rest.  
  * Secure Authentication: Implement industry-standard security practices for user authentication and session management.  
  * Bank Integration Security: If implementing bank synchronization, use a reputable third-party aggregator like Plaid or Yodlee to ensure the highest level of security.

### **5.3. Performance**

* **Fast Load Times:** The application should be optimized for speed to provide a smooth user experience.  
* **Scalability:** The architecture should be designed to handle a growing number of users and data.

## **6. Current Implementation Status**

### **6.1. Completed Features**

* **Dashboard:** Sample accounts, charts, and a modal for adding additional accounts (state only)
* **Authentication:** Login and signup forms with basic validation and simulated success flows
* **Transactions:** Manual entry modal, category/account/date/search filters, and quick-transaction presets
* **Category Management:** Default category tree seeded to localStorage with color/icon metadata and on-the-fly category creation
* **Quick Transactions:** User presets persisted in localStorage and accessible from the record button split dropdown
* **Budgeting:** Budget cards with progress indicators and a modal workflow for creating new budgets (stored in component state)
* **Reports & Analytics:** Expense pie chart, income vs. expense bar chart, and cash-flow line chart via Recharts
* **Navigation & Layout:** Responsive header with offcanvas navigation, mobile filter sidebar, and Bootstrap-based theming

### **6.2. Implementation Notes**

* Transactions view is now composed of focused hooks/components (`useCategoryData`, `useQuickTransactions`, `CategoryDropdown`, `QuickActions`, and modal shells) to keep renders predictable
* Derived structures such as `categoryTree`, parent color maps, and icon lookups are memoized and no longer recalculated on every render
* Category and quick-transaction datasets persist in `localStorage`; transactions, accounts, and budgets remain in-memory samples
* Filtering logic applies search text, categories, account selection, and optional date range before rendering the transaction table
* Modal forms validate only for required fields and simulate success; no API or error messaging layer exists yet
* The build is managed with Create React App (`npm run build` passes) and React Bootstrap supplies core UI components

### **6.3. Outstanding Gaps vs. PRD**

* No real authentication, backend integration, or persistent user storage beyond the local browser
* Categories cannot yet be renamed, re-colored, or deleted through the UI
* Transactions, budgets, and accounts do not sync or save between sessions
* Advanced transaction features (attachments, recurring rules, CSV export) are not implemented
* Accessibility testing, keyboard navigation refinements, and automated test coverage are still pending
