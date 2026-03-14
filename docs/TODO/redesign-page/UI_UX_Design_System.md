# Minimal Design System Guidelines

A premium financial application must balance clarity with modern aesthetics. Use this minimalist design system to overhaul the application.

## 1. Color Palette

Move away from massive saturated blocks of color. Rely primarily on white space, neutral grays for separation, and use brand/semantic colors sparingly to draw attention.

*   **Primary Brand:** Emerald Green `#059669`
    *   *Usage:* Primary calls to action (CTAs), active navigation states, checked toggles/boxes, positive financial figures (Income).
*   **Secondary Accent:** Slate Blue `#3b82f6` or `#0ea5e9`
    *   *Usage:* Interactive non-financial elements (links, secondary icons, specialized active states).
*   **Backgrounds & Surfaces:**
    *   *App Background:* Off-white/Light Gray `#f8fafc` or `#f3f4f6`
    *   *Card/Widget Background:* Pure White `#ffffff`
    *   *Hover States/Input Backgrounds:* `#f1f5f9`
*   **Typography (Neutrals):**
    *   *Headings & Primary Text:* Slate Dark `#0f172a` or `#111827`
    *   *Secondary/Muted Text:* Slate Gray `#64748b` or `#6b7280`
    *   *Borders & Dividers:* `#e2e8f0` or `#e5e7eb`
*   **Semantic / State Colors:**
    *   *Error / Negative Balance (Expense):* Crimson Red `#dc2626`
    *   *Warning:* Amber `#d97706`

## 2. Typography Scale

Use a clean, modern sans-serif like `Inter` or `System UI`. Avoid mixing font families.

*   **Display / Massive Metrics:** `36px` to `48px`, font-weight `700` (Bold)
    *   *Usage:* Big "Total Balance" numbers on the dashboard.
*   **H1 / Page Titles:** `24px` to `28px`, font-weight `700` (Bold)
    *   *Usage:* Page headers (e.g., "Transactions", "Accounts").
*   **H2 / Widget Headers:** `18px` to `20px`, font-weight `600` (Semi-bold)
    *   *Usage:* Titles inside cards (e.g., "Balance Trend", "Recent Transactions").
*   **Body / Base Text:** `14px` or `16px`, font-weight `400` (Regular) or `500` (Medium)
    *   *Usage:* Standard transaction names, general UI text, input fields.
*   **Captions & Metadata:** `12px` or `13px`, font-weight `400` (Regular)
    *   *Usage:* Timestamps, tiny helpful labels, sub-text under account names (e.g., "cash", categories).

## 3. Button Styles

All buttons should have a consistent `border-radius: 8px` or pill shape `999px` to feel thoroughly modern.

*   **Primary Button:**
    *   *Background:* Emerald Green (`#059669`)
    *   *Text:* White
    *   *Usage:* The main action on a page (e.g., "+ Record", "Add Account"). Max 1-2 per view.
*   **Secondary / Outline Button:**
    *   *Background:* Transparent or White
    *   *Border:* `#e2e8f0` (Light Gray)
    *   *Text:* `#0f172a` (Dark Slate)
    *   *Hover:* Background `#f8fafc`
    *   *Usage:* "Cancel", "Reset Filters", secondary modal actions.
*   **Ghost / Icon Button:**
    *   *Background:* Transparent
    *   *Text/Icon Color:* `#64748b` (Slate Gray)
    *   *Hover:* Background `#f1f5f9`, Text `#0f172a`
    *   *Usage:* Bulk edit tools (Edit, Export, Delete), settings gears, drag handles.

## 4. Spacing Rules

Adhere to a strict 4pt or 8pt grid system. Never use random pixel values like `11px` or `23px`.

*   **Micro (4px / 8px):** Gap between an icon and its label, or tight structural lists.
*   **Small (12px / 16px):** Padding inside standard buttons, inputs, dropdown menus, or spacing between tightly related lines of text.
*   **Medium (24px):** Padding inside standard widget cards/containers. Gap between grid items.
*   **Large (32px / 40px):** Spacing between completely separate sections on a page (e.g., space below the page header and the start of the content).
*   **Drop Shadows:** Use exceedingly soft, diffuse shadows for depth (`box-shadow: 0 10px 25px rgba(0,0,0,0.05)`). Never use harsh, dark borders for cards.

## 5. Icon Usage Guidelines

*   **Style:** Stick to one consistent icon family (like Outline versions of `react-icons/fa` or `react-icons/ri` or `lu` Lucide icons).
*   **Weight:** Avoid mixing thick solid icons with thin outline ones. For a premium, modern feel, use consistent outline icons for UI interactions (settings, edit, trash) and only use solid colors for highly semantic financial categories (e.g., solid green money bill, solid red food plate).
*   **Size:** Standardize sizes: `16px` for inline/button icons, `20px` for contextual indicators, `24px` for generic navigation menus. Do not upscale them to look like massive illustrations.
*   **Containers:** If an icon needs emphasis (like an Account type logo), wrap it in a slightly colored container with a softly rounded corner (`12px` radius), never a sharp square.
