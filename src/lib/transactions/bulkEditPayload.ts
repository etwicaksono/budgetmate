/** How `label_ids` is applied to each transaction. */
export type LabelMode = 'replace' | 'append';

/** Fields a bulk edit can change; omitted keys are left untouched on the server. */
export interface BulkEditValues {
  description?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  category_id?: string;
  label_ids?: string[];
  /** Only meaningful alongside `label_ids`; defaults to append on the server. */
  label_mode?: LabelMode;
}

/** Raw modal state, before empty inputs are interpreted as "no change". */
export interface BulkEditFormState {
  description: string;
  payee: string;
  paymentMethod: string;
  paymentStatus: string;
  categoryId: string | null;
  /** Checkbox: replace the existing labels instead of adding to them. */
  replaceLabels: boolean;
  labelIds: string[];
}

/**
 * Turns modal state into a request payload, dropping every field the user left alone.
 *
 * Blank and whitespace-only text counts as "no change" so a stray space can never
 * wipe a field across the whole selection.
 *
 * Labels follow a small truth table, where the checkbox means "replace":
 * - replace + labels  → swap the existing labels for this set
 * - replace + none    → clear all labels
 * - append  + labels  → add these on top of whatever each transaction already has
 * - append  + none    → nothing to do, so `label_ids` is omitted entirely
 */
export function buildBulkEditPayload(state: BulkEditFormState): BulkEditValues {
  const description = state.description.trim();
  const payee = state.payee.trim();
  const touchesLabels = state.replaceLabels || state.labelIds.length > 0;

  return {
    ...(description !== '' && { description }),
    ...(payee !== '' && { payee }),
    ...(state.paymentMethod !== '' && { payment_method: state.paymentMethod }),
    ...(state.paymentStatus !== '' && { payment_status: state.paymentStatus }),
    ...(state.categoryId !== null && { category_id: state.categoryId }),
    ...(touchesLabels && {
      label_ids: state.labelIds,
      label_mode: (state.replaceLabels ? 'replace' : 'append') satisfies LabelMode
    })
  };
}

/** True when the payload would actually change something. */
export function hasBulkEditChanges(values: BulkEditValues): boolean {
  return Object.keys(values).length > 0;
}
