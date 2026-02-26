# Transactions Page UI/UX Improvements

## Overview
The Transactions list suffers from severe scanning issues due to poor alignment, weak visual separators, and disconnected bulk action buttons. By refining these, the data will become significantly more readable.

## Proposed Changes

### 1. Layout Changes
*   **Fix Bulk Action Alignment:** The "Edit | Export | Delete" buttons are awkwardly floating in the center of the list header. They should be moved to the far right, or directly next to the "Select all" checkbox, so the relationship between selection and action is visually clear.
*   **Constrain List Width:** Cap the maximum width of the transaction list on ultra-wide screens to prevent the "river of white space" between the transaction description and the amount. It is currently very difficult for the eye to track across.

### 2. Spacing & Hierarchy
*   **Strengthen Date Separators:** The tiny gray line (`<hr>`) separating dates is too weak. Replace it with a stronger visual break—perhaps a distinct light gray header row with bolder font for the date.
*   **Align Date Picker:** Ensure the period selector (`< [Feb 20...] >`) vertically aligns comfortably with the list elements below it. Right now it floats unconnected above the table.

### 3. Typography Suggestions
*   **Kill the Decimals:** Format IDR amounts without the trailing `.00`. This instantly reduces visual noise.
*   **Style Edge Cases:** Text elements like "End of records" at the bottom of the list look like unstyled debug text. They need proper formatting (e.g., muted, centered, proper line-height).

### 4. Color Usage
*   **Refine Financial Colors:** Ensure the green (income) and red (expense) colors are sophisticated (not pure `#FF0000` or `#00FF00`) and meet WCAG accessibility standards against the white background.
*   **Brand the Filters:** Override default Bootstrap blue accents in the sidebar (like the Amount Range slider thumb) with the app's primary green (`#059669`).

### 5. Button and CTA Improvements
*   **Checkboxes and Toggles:** Ensure the active states for sorting dropdowns or selected checkboxes match the core brand aesthetic rather than looking like standard browser defaults.
