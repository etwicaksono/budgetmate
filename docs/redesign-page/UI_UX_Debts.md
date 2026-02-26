# Debts Page UI/UX Improvements

## Overview
The Debts page currently suffers from mixed visual signals, specifically concerning its empty state and the styling of summary cards versus the rest of the application.

## Proposed Changes

### 1. Layout Changes
*   **Hide Empty Filters:** If the application detects 0 total debts, do not show the massive filter sidebar (Search, Status, Type). Filtering an empty dataset is impossible. Bring the empty state illustration to the center.

### 2. Spacing & Hierarchy
*   **Consistent Summary Cards:** The summary cards at the top ("Total Lent") have pale backgrounds with no borders and look like disabled buttons or static alert banners. They lack the depth and crispness of the Dashboard or Analytics cards. Ensure they have white backgrounds, a slight border radius, and a subtle drop shadow to match the app's design system.

### 3. Typography Suggestions
*   **Remove IDR Decimals:** Rip out `.00` on the "Rp 0" labels. Ensure the currency symbol and formatting strictly matches the application's standard (e.g., sticking to `IDR` or `Rp` consistently).

### 4. Color Usage
*   **Fix Sidebar Accordions:** The accordion headers in the filter sidebar are a pastel blue that clashes with the app's primary green identity. Update these backgrounds to be either clean white with a subtle gray border, or use the brand's primary color palette for active states.

### 5. Button and CTA Improvements
*   **Resolve Conflicting Empty States:** When there are 0 debts, the screen displays "0 debts found" on the top left, a redundant "No debts found" message in the center, a weak outline button for "Add your first debt", and a solid green primary "+ New Debt" button on the top right. 
    *   **Fix:** Remove the weak outline button. Leave one single, beautifully styled primary CTA ("+ New Debt") anchored centrally in a well-designed empty state illustration space.
