# Analytics Page UI/UX Improvements

## Overview
The Analytics "Incomes & Expenses Report" table currently looks like a raw, unstyled spreadsheet. Data is dense, difficult to scan, and visually cluttered with repetitive iconography.

## Proposed Changes

### 1. Layout Changes
*   **Implement a Premium Data Table:** Transition the current list view to a proper data-table format. The headers (December 2025, etc.) need distinct separation from the rows.
*   **Right-Align Numbers:** Financial amounts (IDR xxx) strictly must be aligned to the right. This allows users to compare magnitudes (millions vs thousands) effortlessly by scanning down a column.

### 2. Spacing & Hierarchy
*   **Zebra Striping:** Add very subtle zebra striping (alternating row backgrounds, e.g., `#ffffff` and `#f9fafb`) to help the eye track horizontally across wide tables.
*   **Clear Row Separation:** Ensure headers ("Total Income" vs Category rows) have distinct spacing and font weights so the hierarchy of categories and sub-categories is unmistakable.

### 3. Typography Suggestions
*   **Kill the Decimals:** Once again, strip `.00` from all IDR amounts. In a dense table, trailing decimals add significant cognitive overload.
*   **Subtle Headers:** Make column headers (months) slightly smaller, uppercase, and muted gray to establish a strong structural frame around the data.

### 4. Color Usage
*   **Reduce Icon Clutter:** The table uses a list icon (`::=`) next to every single row, perfectly aligned with nothing, creating a messy look. Remove these entirely. Rely on indentation or a simple dot if indicating sub-items.
*   **Mute the Text Soup:** The tiny labels (e.g., "cash" under the names, or repetitive text) need to be significantly muted (`#9ca3af` text-gray-400 or lighter).

### 5. Button and CTA Improvements
*   **Refine the Chart Selectors:** Ensure the toggle buttons ("Incomes & Expenses Report", "Balance Trend", etc.) are distinctly styled as segmented controls or tabs. The current green active state is a bit heavy; consider a subtle underline or a segmented pill design that feels more modern.
