import { NextRequest, NextResponse } from "next/server";
import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { errorResponse, successResponse } from "@/lib/api/response";
import { buildTransactionWhere, InvalidFilterError } from "@/lib/api/transactionFilters";
import { buildBulkUpdateSkipSummary } from "@/lib/api/bulkUpdateSummary";
import {
  buildAffectedTransferWhere,
  buildSoftDeleteStamp,
  buildSoftDeleteWhere
} from "@/lib/api/transactionSoftDelete";
import { BulkUpdateTransactionsSchema } from "@/lib/validation/transaction";
import { logError } from '@/lib/logger';

/** Transfer and debt legs are managed as pairs, so bulk edit never touches them. */
const PAIRED_TYPES: TransactionType[] = [
  TransactionType.transfer_in,
  TransactionType.transfer_out,
  TransactionType.debt_in,
  TransactionType.debt_out
];

/** Rows updated per chunk when label associations have to be rewritten. */
const LABEL_CHUNK_SIZE = 500;

/** Upper bound for label rewrites, which cannot be expressed as a single updateMany. */
const MAX_LABEL_UPDATE_ROWS = 10000;

/** Expands a parent category into itself plus its children so filters match the UI. */
async function resolveCategoryChildren(categoryId: string): Promise<string[]> {
  const categoryWithChildren = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { children: { select: { id: true } } }
  });

  return categoryWithChildren?.children.map(child => child.id) ?? [];
}

/** Merges an extra condition into `where.AND` without clobbering existing filters. */
function withAndCondition(
  where: Prisma.TransactionWhereInput,
  condition: Prisma.TransactionWhereInput
): Prisma.TransactionWhereInput {
  const existing = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
  return { ...where, AND: [...existing, condition] };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Soft deletes many transactions at once.
 *
 * Rows are stamped with `deleted_at` rather than removed, matching
 * `DELETE /transactions/[id]`. Deleting one leg of a transfer also takes its
 * paired leg, otherwise the two accounts would be left permanently unbalanced.
 * Already-deleted rows are ignored, so repeating a request is a no-op.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) {
      return authResult.error;
    }
    const userId = authResult.user.user_id;

    const body = await req.json();
    const { allMatching, ids, filters } = body;

    // Validate request
    if (!allMatching && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return errorResponse("BAD_REQUEST", "Must provide array of ids or specify allMatching = true", 400);
    }

    // The rows the user actually selected. `deleted_at: null` keeps the operation
    // idempotent: a second identical request reports 0 instead of re-stamping.
    const baseWhere: Prisma.TransactionWhereInput = allMatching
      ? // Shares the filter semantics of GET /transactions so "select all matching"
        // deletes exactly the rows the user is looking at.
        await buildTransactionWhere(userId, filters, { resolveCategoryChildren })
      : { id: { in: ids }, user_id: userId, deleted_at: null };

    // Selected rows plus every remaining leg of any transfer they belong to
    const softDeleteWhere = buildSoftDeleteWhere(userId, baseWhere);

    const now = new Date();
    const deletedCount = await prisma.$transaction(async tx => {
      // Stamped first: once the legs are soft deleted, `baseWhere` no longer
      // matches anything and the affected transfers could not be found.
      await tx.transfer.updateMany({
        where: buildAffectedTransferWhere(userId, baseWhere),
        data: { updated_at: now, updated_by: userId }
      });

      const result = await tx.transaction.updateMany({
        where: softDeleteWhere,
        data: buildSoftDeleteStamp(userId, now)
      });

      return result.count;
    });

    return successResponse({ deletedCount }, { message: `Successfully deleted ${deletedCount} transaction(s)` }, 200);

  } catch (error) {
    if (error instanceof InvalidFilterError) {
      return errorResponse("INVALID_FILTER", error.message, 400);
    }
    logError("Bulk delete error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to delete transactions", 500);
  }
}

/**
 * Applies the same field values to many transactions at once.
 *
 * Only the fields present in `data` are written; everything else is left alone.
 * Labels honour `label_mode`: 'replace' swaps the whole set (an empty list clears
 * it), while 'append' only adds to what each transaction already has.
 *
 * Transfer and debt rows are skipped because their amounts are paired, and when a
 * single-type category is applied, rows of the opposite type are skipped rather
 * than mislabelled. Both skip reasons are reported back separately.
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(req);
    if ('error' in authResult) {
      return authResult.error;
    }
    const userId = authResult.user.user_id;

    const validation = BulkUpdateTransactionsSchema.safeParse(await req.json());
    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, validation.error.errors);
    }

    const { allMatching, ids, filters, data } = validation.data;

    const baseWhere: Prisma.TransactionWhereInput = allMatching
      ? await buildTransactionWhere(userId, filters, { resolveCategoryChildren })
      : { id: { in: ids ?? [] }, user_id: userId, deleted_at: null };

    const requestedCount = await prisma.transaction.count({ where: baseWhere });

    // Paired rows are excluded via AND so an incoming `type` filter still applies
    const eligibleWhere = withAndCondition(baseWhere, {
      type: { notIn: PAIRED_TYPES },
      transfer_id: null,
      debt_id: null
    });

    let category: { id: string; type: string } | null = null;
    if (data.category_id) {
      // Category uses is_active as its soft-delete flag (no deleted_at column)
      category = await prisma.category.findFirst({
        where: { id: data.category_id, user_id: userId, is_active: true },
        select: { id: true, type: true }
      });

      if (!category) {
        return errorResponse('INVALID_CATEGORY', 'Category not found or inactive', 404);
      }
    }

    let uniqueLabelIds: string[] | undefined;
    if (data.label_ids) {
      uniqueLabelIds = [...new Set(data.label_ids)];

      if (uniqueLabelIds.length > 0) {
        const labels = await prisma.label.findMany({
          where: { id: { in: uniqueLabelIds }, user_id: userId },
          select: { id: true }
        });

        if (labels.length !== uniqueLabelIds.length) {
          return errorResponse('INVALID_LABEL', 'One or more labels not found', 404);
        }
      }
    }

    // An income/expense category may only be applied to rows of the same type
    const isTypeConstrained = category !== null && category.type !== 'both';
    const typeConstrainedWhere =
      category && isTypeConstrained
        ? withAndCondition(eligibleWhere, { type: category.type as TransactionType })
        : eligibleWhere;

    // Counted before writing: an allMatching filter may key off a field being changed,
    // which would make the same query return a different set afterwards.
    const eligibleCount = isTypeConstrained
      ? await prisma.transaction.count({ where: eligibleWhere })
      : null;

    // Unchecked variant: category_id is a foreign-key scalar, which the checked
    // TransactionUpdateManyMutationInput does not expose
    const scalarUpdate: Prisma.TransactionUncheckedUpdateManyInput = {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.payee !== undefined && { payee: data.payee }),
      ...(data.payment_method !== undefined && { payment_method: data.payment_method }),
      ...(data.payment_status !== undefined && { payment_status: data.payment_status }),
      ...(data.category_id !== undefined && { category_id: data.category_id }),
      updated_at: new Date(),
      updated_by: userId
    };

    let updatedCount = 0;

    // Appending nothing is a no-op, so it can take the cheap single-statement path
    const rewritesLabels =
      uniqueLabelIds !== undefined &&
      (data.label_mode === 'replace' || uniqueLabelIds.length > 0);

    if (!rewritesLabels) {
      const result = await prisma.transaction.updateMany({
        where: typeConstrainedWhere,
        data: scalarUpdate
      });
      updatedCount = result.count;
    } else {
      if (requestedCount > MAX_LABEL_UPDATE_ROWS) {
        return errorResponse(
          'TOO_MANY_RECORDS',
          `Label update is limited to ${MAX_LABEL_UPDATE_ROWS} transactions per request`,
          400
        );
      }

      // Labels are a junction table, so rows must be resolved and rewritten in chunks
      const targets = await prisma.transaction.findMany({
        where: typeConstrainedWhere,
        select: { id: true }
      });
      const targetIds = targets.map(t => t.id);
      const labelIds = uniqueLabelIds ?? [];
      const isReplace = data.label_mode === 'replace';

      for (const idChunk of chunk(targetIds, LABEL_CHUNK_SIZE)) {
        await prisma.$transaction(async tx => {
          const result = await tx.transaction.updateMany({
            where: { id: { in: idChunk } },
            data: scalarUpdate
          });

          if (isReplace) {
            await tx.transactionLabel.deleteMany({
              where: { transaction_id: { in: idChunk } }
            });
          }

          if (labelIds.length > 0) {
            // skipDuplicates leans on @@unique([transaction_id, label_id]) so appending
            // a label a transaction already carries stays a no-op instead of failing
            await tx.transactionLabel.createMany({
              data: idChunk.flatMap(transaction_id =>
                labelIds.map(label_id => ({ transaction_id, label_id }))
              ),
              skipDuplicates: true
            });
          }

          updatedCount += result.count;
        });
      }
    }

    // Without a type constraint every eligible row was updated, so the counts coincide
    const skipped = buildBulkUpdateSkipSummary({ requestedCount, eligibleCount, updatedCount });

    return successResponse(
      { updatedCount, skipped },
      { message: `Successfully updated ${updatedCount} transaction(s)` },
      200
    );

  } catch (error) {
    if (error instanceof InvalidFilterError) {
      return errorResponse('INVALID_FILTER', error.message, 400);
    }
    logError('Bulk update error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update transactions', 500);
  }
}
