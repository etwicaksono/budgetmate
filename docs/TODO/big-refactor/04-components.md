# Components Refactor TODO

## Summary

The component layer is generally solid, but the biggest refactor opportunities are still structural rather than correctness-related. The review reinforces the earlier pattern: the codebase is strongest where components are small, composable, and CSS-driven, and weakest where a single file owns both orchestration and rendering.

The main themes in this pass are:

- repeated modal shells and footer/action layouts across transaction, debt, and budget flows
- repeated select/dropdown/filter patterns, especially in transaction and sidebar controls
- large stateful components that mix data fetching, transformation, persistence, and UI rendering
- pervasive inline styling in records, analytics, charts, and chat surfaces
- some accessibility gaps around clickable non-button elements and icon-only controls

## Architecture Issues

- **Modal duplication:** `TransactionModal.tsx`, `DebtModal.tsx`, `RepaymentModal.tsx`, `DebtIncreaseModal.tsx`, and `BudgetConfigModal.tsx` all implement the same broad modal lifecycle pattern: initialize/reset state, validate, submit, show spinner/error state, and render a responsive footer. The content differs, but the shell is highly repeatable.
- **Dropdown/select pattern duplication:** `TransactionForm.tsx`, `FilterInputs.tsx`, `SortDropdown.tsx`, and `SavedFiltersManager.tsx` all implement their own versions of option menus, checked states, and menu styling. These would benefit from a shared dropdown field primitive or wrapper.
- **Inline styling pressure:** `RecordsList.tsx`, `RecordsHeader.tsx`, `AIChatPanel.tsx`, `IncomesExpensesReport.tsx`, and the chart components still rely on many inline style objects. That makes them harder to theme, harder to test visually, and harder to keep consistent.
- **Large orchestration components:** `AIChatPanel.tsx`, `IncomesExpensesReport.tsx`, `BudgetConfigModal.tsx`, and `SavedFiltersManager.tsx` each combine state management, derived data, async fetching, and presentational markup in one file. Those are the best candidates for extraction first.
- **A11y improvement opportunities:** Several files still use clickable `div`/`span` elements, icon-only buttons, or custom dropdown interactions that would be easier to navigate if moved to semantic buttons or more accessible primitives.

## Per-File Findings

### src/components/transaction/TransactionModal.tsx
- **Issues**:
  - `L31-L61`: the modal owns both lifecycle orchestration and form initialization/reset behavior, which is fine for a small feature but already creates a fairly busy effect graph.
  - `L63-L137`: the save handler builds two nearly parallel payload shapes for create vs. update. The allowed fields differ slightly, but the date conversion and most of the field mapping are duplicated.
  - `L141-L226`: the footer is a dense block of conditional actions (`delete`, `confirm draft`, `clone as draft`, `save`, `save as draft`, `save & create another`) with responsive ordering baked directly into the component.
- **Refactor TODO**:
  - Extract a `buildTransactionPayload(formData, mode, overrideDraftState)` helper so the create/update branches share a single mapping path.
  - Pull the footer actions into a reusable modal action bar, especially if other modals need the same responsive button layout.
  - Consider separating the save side effect from the UI shell so the modal can stay mostly presentational.
- **Priority**: high

### src/components/transaction/TransactionForm.tsx
- **Issues**:
  - `L36-L79`: the form is already carrying a lot of field wiring boilerplate, with several small `useCallback` wrappers that mostly translate nulls to empty strings.
  - `L82-L165`: transfer-mode rendering duplicates the same label + select + error-display patterns later used by the regular transaction layout.
  - `L167-L355`: the component mixes field layout, validation display, conditional transfer behavior, inline spacing adjustments, and clear-button affordances in one large JSX block.
  - `L108-L118`, `L146-L147`, `L177-L178`, `L299-L300`: repeated inline spacing hacks are doing layout work that should really live in CSS.
- **Refactor TODO**:
  - Split the transfer-only fields and the regular transaction fields into separate subcomponents or field groups.
  - Introduce a shared field wrapper for `label + control + invalid-feedback` so the repeated form patterns disappear.
  - Move the inline spacing and alignment tweaks into CSS classes.
- **Priority**: high

### src/components/Records/RecordsList.tsx
- **Issues**:
  - `L68-L99`: record confirmation state, icon lookup, and action guards are all embedded inside the list renderer.
  - `L101-L400`: the component is doing grouping, selection, long-press handling, icon resolution, badge rendering, row rendering, and dropdown action rendering all at once.
  - `L182-L207`, `L391-L400`: row interaction is driven by clickable `div`/`Card` wrappers with touch/press logic layered on top, which is harder to reason about and less accessible than semantic row actions.
  - `L207-L345`: the list contains a large number of inline style objects for sizing, spacing, badge colors, and text truncation.
- **Refactor TODO**:
  - Extract `RecordsDayGroup` and `RecordRow` components so selection, long-press, and action handling are easier to isolate.
  - Move icon/color/badge presentation into reusable presentational helpers.
  - Replace the clickable wrapper `div` pattern with semantic buttons or a more accessible row interaction model.
- **Priority**: high

### src/components/Records/RecordsHeader.tsx
- **Issues**:
  - `L32-L67` and `L147-L166`: the summary text parsing logic is duplicated across the two major branches of the header.
  - `L34-L170`: selection state, global select-all hints, bulk action buttons, and summary rendering are all interleaved in one branch-heavy component.
  - `L74-L95`, `L119-L127`, `L146-L167`: several inline style blocks are handling spacing and link-like affordances that should be class-based.
- **Refactor TODO**:
  - Extract the summary renderer so the currency-color parsing is defined once.
  - Split the active-selection banner from the default header row.
  - Convert the “select all matching records” copy into a small reusable status/banner component.
- **Priority**: medium

### src/components/debt/DebtModal.tsx
- **Issues**:
  - `L60-L81`: the modal initializes multiple pieces of state from props and resets them on open, which mirrors the same pattern used by the repayment/increase modals.
  - `L85-L137`: validation and submit payload construction are straightforward, but the branching is already setting up the same boilerplate repeated elsewhere.
  - `L139-L295`: the modal shell, form layout, clear-button logic, amount formatting, and footer action layout are all hardcoded here.
  - `L163-L166`, `L205-L206`, `L260-L264`: inline spacing for clear buttons is repeated in a way that will be painful to keep consistent.
- **Refactor TODO**:
  - Extract a shared debt movement form shell that can be reused by repayment and increase flows.
  - Centralize the date/amount/clear-button field groups into small subcomponents.
  - Move the modal footer into a shared action footer pattern.
- **Priority**: high

### src/components/debt/RepaymentModal.tsx
- **Issues**:
  - `L55-L70`: open/reset initialization is almost the same shape as `DebtModal` and `DebtIncreaseModal`.
  - `L77-L114`: submit validation and payload creation are simple, but the component still owns all persistence concerns directly.
  - `L116-L229`: the modal rendering is another copy of the same debt-form shell: account, amount, date, description, alert panel, and footer buttons.
  - `L162-L173`, `L206-L217`: clear-button positioning is handled with inline layout hacks again.
- **Refactor TODO**:
  - Reuse a shared debt transaction form component for account/amount/date/description.
  - Move the informational alert into a small summary header component.
  - Consolidate the repeated clear-button affordance into a shared input wrapper.
- **Priority**: high

### src/components/debt/DebtIncreaseModal.tsx
- **Issues**:
  - `L56-L71`: open/reset behavior is still duplicated from the other debt modals.
  - `L77-L109`: submit flow is structurally identical to the repayment modal, just with a different label and success path.
  - `L111-L227`: the same modal shell, alert, account picker, amount field, date field, description field, and footer controls appear again.
  - `L161-L174`, `L202-L215`: the clear-button positioning and spacing hacks repeat yet again.
- **Refactor TODO**:
  - Fold repayment and increase into one shared debt movement modal base with a mode prop.
  - Extract the repeated alert/header copy into a summary block.
  - Move shared formatting and clear-button behavior into a shared form field component.
- **Priority**: high

### src/components/budgets/BudgetConfigModal.tsx
- **Issues**:
  - `L37-L84`: the skeleton UI is built inline with repeated placeholder blocks, which makes the loading state longer and more brittle than it needs to be.
  - `L86-L175`: the component uses multiple effects for category initialization, budget loading, and history loading, making the modal a small data orchestration layer rather than a pure editor.
  - `L177-L217`: validation and derived values are computed directly in the component body, which is fine, but adds to the modal’s responsibilities.
  - `L219-L437`: the rendered modal mixes category selection, historical suggestion UI, monthly limits, annual limits, validation warnings, and footer actions in one long JSX tree with extensive inline styling.
- **Refactor TODO**:
  - Extract a `useBudgetConfig` hook that owns category loading, budget fetching, history fetching, and derived totals.
  - Split the suggestions / monthly limits / annual limits into dedicated subcomponents.
  - Move the repeated card borders, gradients, and typography into CSS classes.
- **Priority**: high

### src/components/analytics/AIChatPanel.tsx
- **Issues**:
  - `L111-L139`: localStorage synchronization and document-level click handling are embedded directly in the component, which makes the state lifecycle harder to follow.
  - `L159-L172`: textarea auto-sizing is managed imperatively via DOM mutation, which is workable but not very declarative.
  - `L176-L381`: the send pipeline combines config loading, session creation, token recovery, streaming parsing, error handling, and session refresh in one callback.
  - `L438-L1023`: the render tree is huge and includes two separate session list UIs, a floating shell, a sidebar shell, message rendering, input controls, and provider/model selectors.
  - `L462-L571` and `L642-L744`: the conversation history UI is duplicated for the expanded desktop sidebar and the floating/mobile mode.
  - `L348-L353`: the streaming message update mutates the last message object in place before returning the new array, which is easy to miss in maintenance work.
  - `L468-L470`, `L495-L496`, `L549-L550`, `L557-L558`, `L722-L723`, `L730-L731`, etc.: hover styling is handled by direct inline DOM mutation in several places instead of CSS.
- **Refactor TODO**:
  - Extract the session/networking logic into a dedicated AI chat hook.
  - Split the floating panel shell, sidebar history list, message list, and input toolbar into separate presentational components.
  - Replace imperative hover and sizing style mutations with CSS classes or a small styling layer.
- **Priority**: high

### src/components/analytics/IncomesExpensesReport.tsx
- **Issues**:
  - `L92-L175`: category traversal, date-window math, and modal state assembly all live inside the report component body.
  - `L181-L216`: sorting and percentage-difference helpers are defined inline instead of being shared utilities.
  - `L218-L443`: desktop row rendering is substantial and handles both parent and child categories, click-through transaction drill-down, and conditional percent deltas.
  - `L445-L519`: the mobile rendering path repeats the same overall data-shaping logic with a different visual presentation.
  - `L546-L607`: the settings dropdown is another inline chunk of UI state and layout logic inside the same file.
  - `L611-L643`: the component injects a large `<style>` block directly in the render path, which is a sign that the view logic is still too tightly coupled to presentation details.
- **Refactor TODO**:
  - Extract date-window construction and category filtering/sorting into pure helpers.
  - Split desktop and mobile report rows into reusable row/summary subcomponents.
  - Move the embedded style block into a CSS module or component stylesheet.
- **Priority**: high

### src/components/dashboard/widgets/NetWorthWidget.tsx
- **Issues**:
  - `L19-L46`: localStorage persistence is implemented inline, which is okay, but it couples the widget to browser state more than necessary.
  - `L73-L86`: toggle load/save behavior is mixed into the widget instead of a small persistence hook.
  - `L111-L189`: the widget combines toggle chips, totals, and breakdown presentation in one component; this is still manageable, but the toggle chip section is starting to look like a reusable primitive.
  - `L148-L153`: the draft toggle is visually customized with inline styling rather than a class-based variant.
- **Refactor TODO**:
  - Extract a `useNetWorthToggleState` hook for browser persistence.
  - Consider a small chip-group subcomponent if other dashboards need the same hide/show pattern.
  - Move the draft chip overrides into CSS or a variant prop.
- **Priority**: medium

### src/components/FilterSidebar/FilterInputs.tsx
- **Issues**:
  - `L13-L47`: the prop surface is very wide, which is a smell that this component is acting as a generic filter schema renderer rather than a narrow UI piece.
  - `L93-L364`: the component renders many different filter types, but most of the logic is the same shape repeated with different labels and option lists.
  - `L206-L363`: the transfer, debt, and draft dropdowns repeat the same menu structure, option highlighting, and checkmark layout.
  - `L95-L127`, `L161-L188`, `L191-L204`: several inline style blocks are handling icon alignment and control spacing.
- **Refactor TODO**:
  - Introduce a shared option-dropdown primitive for the include/only/exclude menus.
  - Break the sidebar into smaller filter-field components grouped by filter type.
  - Reduce the prop surface by pushing more of the configuration into a filter schema object.
- **Priority**: medium

### src/components/FilterSidebar/SavedFiltersManager.tsx
- **Issues**:
  - `L97-L135`: snapshot capture and dirty-state comparison are embedded directly in the UI component.
  - `L143-L355`: the filter selector, reset affordance, save action dropdown, and modal launch state all live in one large interaction surface.
  - `L358-L532`: the “save as new” and “update existing” modals are nearly duplicated, differing mostly in labels and the action handler.
  - `L534-L769`: the manage-filters modal introduces even more nested UI, drag-and-drop wiring, rename state, and delete confirmation flow inside the same file.
  - `L678-L767`: the sortable filter item is reasonably self-contained, but it is still nested deep inside a very large file, making the overall module harder to scan.
- **Refactor TODO**:
  - Extract a shared save-filter modal that can operate in create/update mode.
  - Move snapshot capture and dirty-state diffing into a helper or hook.
  - Split the manage modal and sortable row into their own files so the main manager component stays small.
- **Priority**: high

### src/components/widgets/BalanceTrendChart.tsx
- **Issues**:
  - `L63-L78`: the tooltip is defined inline in the component, which is fine for a one-off chart, but not reusable if other charts need the same visual language.
  - `L85-L159`: the component mixes chart configuration and summary-card rendering in one place; that keeps it convenient, but it is doing two jobs.
  - `L133-L155`: the summary header relies on inline styles for spacing and typography.
- **Refactor TODO**:
  - Extract a shared chart tooltip component or chart wrapper if other views need the same look.
  - Separate the summary header from the chart canvas if the widget needs more reuse.
  - Move the inline spacing/typography into CSS.
- **Priority**: low

### src/components/widgets/CategoryPieChart.tsx
- **Issues**:
  - `L58-L87`: selection, tooltip content, and drilldown behavior are all embedded together.
  - `L89-L235`: the component renders the chart, center label, legend grid, and optional drilldown button in a single block.
  - `L137-L167`, `L171-L234`: the visual shell is mostly inline-styled, which makes it harder to theme and to keep consistent with the rest of the dashboard widgets.
- **Refactor TODO**:
  - Split the center overlay, legend grid, and drilldown button into separate pieces.
  - Consider a shared chart-shell wrapper if the dashboard will keep adding chart variants.
  - Move repeated layout styles to CSS.
- **Priority**: medium

### src/components/widgets/IncomeExpenseBarChart.tsx
- **Issues**:
  - `L70-L84`: the tooltip is inline and chart-specific, which is fine, but it would be nicer as a reusable tooltip formatter if more bar charts are added.
  - `L86-L102`: the component is otherwise clean, but still combines responsive sizing and the chart itself in one file.
- **Refactor TODO**:
  - Keep as-is unless another bar chart needs the same tooltip/layout pattern.
  - If reused, extract a shared chart wrapper and tooltip helper.
- **Priority**: low

### src/components/common/SortDropdown.tsx
- **Issues**:
  - `L30-L33`: defaulting to `options[0]` when the value is invalid can hide bad state instead of making it obvious.
  - `L40-L107`: the component is already reusable, but styling is still partly inline and the `renderOptionContent` helper gets reused in both the toggle and menu row.
- **Refactor TODO**:
  - Consider surfacing invalid sort values explicitly rather than silently falling back to the first option.
  - Move menu styling to classes if the component is going to be used broadly.
- **Priority**: low

### src/components/common/EmptyState.tsx
- **Issues**:
  - `L18-L39`: the component is intentionally minimal, but it is limited to emoji/string icons and a single action button shape.
  - `L25-L37`: styling is entirely class-based, which is good for Tailwind, but the component could be more flexible if it accepted icon/render props rather than a string icon only.
- **Refactor TODO**:
  - Leave as-is unless you need richer empty-state variants.
  - If expanded, support a render prop for the icon and optional secondary actions.
- **Priority**: low

### src/components/Header.tsx
- **Issues**:
  - `L36-L85`: the header is doing a lot of context-sensitive work, including route matching and deciding whether the primary CTA opens a transaction modal or a debt modal.
  - `L96-L175`: desktop navigation, branding, profile dropdown, and the main action button are all tightly coupled in one shell.
  - `L187-L253`: the mobile offcanvas repeats the same navigation and action items with another copy of the menu structure.
  - `L155-L165`, `L240-L246`: the Help and Report a bug items are visually present but not wired to behavior, which is a mild false-affordance issue.
- **Refactor TODO**:
  - Split navigation/profile actions from the main shell so the header only coordinates high-level layout.
  - Model the primary CTA as a small config object rather than branching inline.
  - Either wire the Help/Bug items or remove them until they are functional.
- **Priority**: medium

### src/components/AppLayout.tsx
- **Issues**:
  - `L17-L35`: the layout is intentionally minimal, but it still owns provider nesting plus both global modals.
  - `L20-L33`: if the provider stack grows further, readability will benefit from an `AppProviders` wrapper.
- **Refactor TODO**:
  - Keep the layout thin and consider wrapping the provider stack in a dedicated component if more providers are added.
  - Leave the global modal placement here unless the app shell is moving toward a more modular composition model.
- **Priority**: low
