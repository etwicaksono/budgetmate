import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/middleware";
import { errorResponse, successResponse } from "@/lib/api/response";

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

    let deletedCount = 0;

    if (allMatching) {
      // Build Prisma Where clause from filters
      const whereClause: Prisma.TransactionWhereInput = {};

      if (filters) {
        if (filters.category_ids) {
          const categoryIdsParam = typeof filters.category_ids === 'string' ? filters.category_ids.split(',').filter((id: string) => id) : [];
          if (categoryIdsParam.length > 0) {
            whereClause.category_id = { in: categoryIdsParam };
          }
        } else if (filters.category_id) {
          // Find all child categories to include in filter
          const categoryWithChildren = await prisma.category.findUnique({
            where: { id: filters.category_id },
            include: { children: true },
          });

          if (categoryWithChildren) {
            const categoryIds = [
              categoryWithChildren.id,
              ...categoryWithChildren.children.map((c: { id: string }) => c.id)
            ];
            whereClause.category_id = { in: categoryIds };
          } else {
            whereClause.category_id = filters.category_id;
          }
        }

        if (filters.account_ids) {
          const accountIdsParam = typeof filters.account_ids === 'string' ? filters.account_ids.split(',').filter((id: string) => id) : [];
          if (accountIdsParam.length > 0) {
            whereClause.account_id = { in: accountIdsParam };
          }
        } else if (filters.account_id) {
          whereClause.account_id = filters.account_id;
        }

        if (filters.start_date || filters.end_date) {
          whereClause.date = {};
          if (filters.start_date) {
            whereClause.date.gte = new Date(filters.start_date);
          }
          if (filters.end_date) {
            whereClause.date.lte = new Date(filters.end_date);
          }
        }

        if (filters.type && filters.type !== "all") {
          // Map frontend type to database enum format
          const typeMapping: Record<string, string> = {
            income: 'INCOME',
            expense: 'EXPENSE',
            transfer: 'TRANSFER',
            transfer_in: 'TRANSFER',
            transfer_out: 'TRANSFER',
            debt_in: 'DEBT_IN',
            debt_out: 'DEBT_OUT'
          };
          const mappedType = typeMapping[filters.type];
          if (mappedType) {
            whereClause.type = mappedType;
          }
        } else {
          const includeTypes: string[] = [];
          const excludeTypes: string[] = [];

          if (filters.transfer_option === 'only') {
            includeTypes.push('transfer', 'transfer_in', 'transfer_out');
          } else if (filters.transfer_option === 'exclude') {
            excludeTypes.push('transfer', 'transfer_in', 'transfer_out');
          }

          if (filters.debt_option === 'only') {
            includeTypes.push('debt_in', 'debt_out');
          } else if (filters.debt_option === 'exclude') {
            excludeTypes.push('debt_in', 'debt_out');
          }

          if (includeTypes.length > 0) {
            whereClause.type = { in: includeTypes };
          } else if (excludeTypes.length > 0) {
            whereClause.type = { notIn: excludeTypes };
          }
        }

        if (filters.label_ids) {
          const labelIdsStr = typeof filters.label_ids === 'string' ? filters.label_ids : '';
          const labelIdsArray = labelIdsStr.split(',').filter((id: string) => id);
          if (labelIdsArray.length > 0) {
            whereClause.labels = {
              some: {
                label_id: { in: labelIdsArray }
              }
            };
          }
        }

        if (filters.search) {
          whereClause.OR = [
            { description: { contains: filters.search, mode: 'insensitive' } },
            { payee: { contains: filters.search, mode: 'insensitive' } }
          ];
        }

        if (filters.min_amount !== undefined || filters.max_amount !== undefined) {
          whereClause.amount = {};
          if (filters.min_amount !== undefined) {
            whereClause.amount.gte = Number(filters.min_amount);
          }
          if (filters.max_amount !== undefined) {
            whereClause.amount.lte = Number(filters.max_amount);
          }
        }

        if (filters.currencies) {
          const currenciesArray = typeof filters.currencies === 'string' ? filters.currencies.split(',').filter((c: string) => c) : [];
          if (currenciesArray.length > 0) {
            whereClause.currency = { in: currenciesArray };
          }
        }
      }

      // Execute bulk delete based on filter conditions
      const result = await prisma.transaction.deleteMany({
        where: {
           ...whereClause,
           user_id: userId // Ensure user validation!
        }
      });
      deletedCount = result.count;

    } else {
      // Execute bulk delete for explicit IDs
      const result = await prisma.transaction.deleteMany({
        where: {
          id: { in: ids },
          user_id: userId // Ensure user validation!
        }
      });
      deletedCount = result.count;
    }

    return successResponse({ deletedCount }, { message: `Successfully deleted ${deletedCount} transaction(s)` }, 200);

  } catch (error) {
    console.error("Bulk delete error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to delete transactions", 500);
  }
}
