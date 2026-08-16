import type { Prisma } from '@prisma/client';

/** Thrown when submitted label IDs don't all belong to the authenticated user. */
export class LabelNotFoundError extends Error {
  constructor() {
    super('One or more labels not found');
    this.name = 'LabelNotFoundError';
  }
}

export interface ResolvedLabel {
  id: string;
  name: string;
  color: string;
}

/** Minimal surface of the Prisma client/transaction the helpers below need. */
type LabelCapableClient = Pick<Prisma.TransactionClient, 'label' | 'debtLabel'>;

/**
 * Verifies every submitted label belongs to the user and returns them for rendering.
 *
 * IDs are deduplicated first so a repeated ID cannot trip the count comparison or
 * violate the junction table's unique constraint.
 */
export async function resolveOwnedLabels(
  client: LabelCapableClient,
  userId: string,
  labelIds: string[]
): Promise<{ uniqueLabelIds: string[]; labels: ResolvedLabel[] }> {
  const uniqueLabelIds = [...new Set(labelIds)];

  if (uniqueLabelIds.length === 0) {
    return { uniqueLabelIds, labels: [] };
  }

  const labels = await client.label.findMany({
    where: { id: { in: uniqueLabelIds }, user_id: userId },
    select: { id: true, name: true, color: true }
  });

  if (labels.length !== uniqueLabelIds.length) {
    throw new LabelNotFoundError();
  }

  return { uniqueLabelIds, labels };
}

/**
 * Replaces a debt's label set, returning the labels so callers can echo them back.
 *
 * An empty list clears the labels; callers decide whether to skip the call entirely
 * (which leaves the existing set untouched).
 */
export async function replaceDebtLabels(
  client: LabelCapableClient,
  userId: string,
  debtId: string,
  labelIds: string[]
): Promise<ResolvedLabel[]> {
  const { uniqueLabelIds, labels } = await resolveOwnedLabels(client, userId, labelIds);

  await client.debtLabel.deleteMany({ where: { debt_id: debtId } });

  if (uniqueLabelIds.length > 0) {
    await client.debtLabel.createMany({
      data: uniqueLabelIds.map((label_id) => ({ debt_id: debtId, label_id }))
    });
  }

  return labels;
}
