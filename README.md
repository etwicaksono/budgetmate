# FinanceApp - Personal Finance Management

This is a personal finance web application built based on the product requirements document. The application provides users with a comprehensive platform to track their income and expenses, manage budgets, and gain insights into their financial health.

## Features

- **User Authentication**: Secure sign-up and login with email/password and third-party services
- **Dashboard**: Accounts-centric overview with customizable widgets
- **Transaction Management**: Manual entry of income and expenses with categories and notes
- **Budgeting**: Create and track budgets for specific categories
- **Reports & Analytics**: Visual reports showing spending patterns and cash flow

## Technologies Used

- React.js for the frontend
- React Bootstrap for UI components
- Recharts for data visualization
- React Router for navigation

## Design Principles

- Clean and modern design
- Intuitive and user-friendly interface
- Responsive design for desktop, tablet, and mobile
- Data visualization using charts and graphs
- Color scheme following the PRD specifications:
  - Primary Color: #4A90E2 (calming blue)
  - Income: #7ED321 (green)
  - Expenses: #D0021B (red)
  - Neutral backgrounds: #F5F5F5 (gray)

## How to Run

1. Make sure you have Node.js installed on your system
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. Open your browser and go to http://localhost:3000

## Project Structure

```
src/
├── components/     # Reusable UI components
│   └── Header.js
├── pages/          # Main application pages
│   ├── Dashboard.js
│   ├── Login.js
│   ├── Signup.js
│   ├── Transactions.js
│   ├── Budgets.js
│   └── Reports.js
├── styles/         # CSS styles
│   ├── App.css
│   └── main.css
├── utils/          # Utility functions
├── index.js        # Application entry point
└── App.js          # Main application component
```

## Implementation Notes

This application implements the core features specified in the PRD:

1. **Dashboard**: Displays account cards with balances and customizable widgets for financial overview
2. **Authentication**: Login and signup pages with form validation
3. **Transactions**: Add, view, and filter transactions with category support
4. **Budgets**: Create and track budgets with visual progress indicators
5. **Reports**: Charts showing expense breakdown, income vs expenses, and cash flow analysis

The UI follows the PRD specification with a clean, modern design using the specified color scheme and focusing on data visualization for financial insights.