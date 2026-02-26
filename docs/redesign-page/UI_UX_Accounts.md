# Accounts Page UI/UX Improvements

## Overview
The Accounts page is functional but suffers from excessive whitespace on large screens and relies heavily on default Bootstrap components that lack a premium, tailored feel.

## Proposed Changes

### 1. Layout Changes
*   **Constrain List Width:** Stop using `Container fluid` for the main list on ultra-wide screens. Cap the `max-width` (e.g., `1200px` or wrapping the list in a narrower column) so the user doesn't have to scan across a massive river of white space to connect an account name on the left to its balance on the right.

### 2. Spacing & Hierarchy
*   **Refine Card Internal Spacing:** Improve the vertical and horizontal alignment between the account icon, the account name, the account type (e.g., "cash"), and the balance. The type label should sit tightly under the name.

### 3. Typography Suggestions
*   **Kill the Decimals:** Remove `.00` from IDR currency formatting globally. It makes numbers much harder to read at a glance.
*   **Label Sizing:** Ensure the "cash" label under the account name is legible but distinctly secondary (smaller font size, muted gray color).

### 4. Color Usage
*   **Consistent Summary Panels:** Ensure the "Total Balance" summary panel in the sidebar matches the visual language of the cards. Currently, it has a faint gray background that breaks from the crisp white card aesthetics.
*   **Negative Balance Colors:** Maintain the red color for negative balances, but ensure it meets WCAG accessibility contrast ratios against the white background so it is clear but not overly alarming.

### 5. Button and CTA Improvements
*   **Context Menu:** The drag handle icon (three lines) on the far right feels slightly disjointed. Ensure its hover state implies interactibility (e.g., a subtle gray background circle on hover).
*   **Add Button:** Ensure the "+ Add" button in the sidebar uses the primary brand green (`#059669`) consistently.
