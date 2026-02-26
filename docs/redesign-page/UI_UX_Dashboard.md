# Dashboard UI/UX Improvements

## Overview
The Dashboard is the first impression of the application. Currently, it feels overwhelming due to heavy color usage and lacks clear data hierarchy. The goal is to make it look premium, scannable, and focused on key metrics.

## Proposed Changes

### 1. Layout Changes
*   **Constrain Widths:** Limit the maximum width of the main content area (e.g., `1200px` or `1440px`) on ultra-wide screens to prevent the user's eye from having to travel too far horizontally.
*   **Restructure Widgets:** Ensure charts and summary cards have consistent padding and alignment. The "Expenses by Category" chart needs a legend and proper axis/labels so it isn't just a floating circle.

### 2. Spacing & Hierarchy
*   **Promote Total Balance:** The "Total Balance" should be the most prominent element on the page, not overshadowed by bright account cards.
*   **Consistent Card Styling:** Normalize the drop shadows, border radiuses, and backgrounds across all summary widgets so they feel like they belong to the same design system.

### 3. Typography Suggestions
*   **Remove `.00` from IDR:** Strip the trailing decimals from all Indonesian Rupiah amounts globally. IDR deals in millions; decimals add visual clutter and cognitive load without providing value.
*   **Font Weights:** Use bolder weights for primary data points (balances) and muted, smaller fonts for secondary labels (account types or "Total Balance" captions).

### 4. Color Usage
*   **Mute the Account Cards:** Replace the heavily saturated, full-bleed background colors on the top account cards with a solid white background and dark text. Use the account's assigned color as a subtle left-border accent or a small colored icon indicator. This instantly makes the app look more premium and less chaotic.
*   **Semantic Colors:** Reserve bright red and green strictly for negative/positive financial trends or actions, not as decorative backgrounds.

### 5. Button and CTA Improvements
*   **Brand Alignment:** Override default Bootstrap blue highlights/focus rings. Use the primary emerald green (`#059669`) for key actions like "+ Record" or "Add Account".
*   **Subtle Secondary Actions:** Make secondary buttons (like "+ Add Account" inside the dashed box) feel interactive but less visually demanding than primary actions.
