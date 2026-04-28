import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateDebtSchema } from '@/lib/validation/debt';

export async function GET(request: NextRequest): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const { user } = authResult;
   const searchParams = request.nextUrl.searchParams;

   const page = parseInt(searchParams.get('page') || '1', 10);
   let limit = parseInt(searchParams.get('limit') || '20', 10);

   // Allow fetching all if limit=0
   if (limit < 0) limit = 20;

   const status = searchParams.get('status');
   const type = searchParams.get('type');
   const counterparty = searchParams.get('counterparty');

   const where: Prisma.DebtWhereInput = {
      user_id: user.user_id,
   };

   if (status) where.status = status;
   if (type) where.type = type;
   if (counterparty) {
      where.counterparty = {
         contains: counterparty,
         mode: 'insensitive',
      };
   }

   // Base pagination computation
   let totalData = 0;
   if (limit > 0) {
      totalData = await prisma.debt.count({ where });
   }

   // Define include structure to fetch linked transactions to compute amounts
   const nestedInclude = {
      account_rel: {
         select: { name: true, icon: true, color: true, currency: true }
      },
      transactions: {
         orderBy: { created_at: 'asc' },
         include: {
            account: { select: { name: true, icon: true, color: true, currency: true } }
         }
      }
   };

   const sortBy = searchParams.get('sort_by') || 'date';
   const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

   const validSortFields = ['date', 'counterparty', 'status', 'amount'];
   const orderByField = validSortFields.includes(sortBy) && sortBy !== 'amount' ? sortBy : 'date';

   const debtsQuery: any = {
      where,
      orderBy: { [orderByField]: sortOrder },
      include: nestedInclude
   };

   // Only apply DB-level pagination if we are NOT sorting in-memory by amount
   if (limit > 0 && sortBy !== 'amount') {
      debtsQuery.skip = (page - 1) * limit;
      debtsQuery.take = limit;
   }

   try {
      const rawDebts = await prisma.debt.findMany(debtsQuery);

      // Compute derived properties: amount and remaining_amount
      let transformedDebts = rawDebts.map((debt: any) => {
         const allTxs = debt.transactions || [];

         // 1. Identify all initial debt transactions based on type (for increases)
         const initialTxType = debt.type === 'lend' ? 'debt_out' : 'debt_in';
         const initialTxs = allTxs.filter((tx: any) => tx.type === initialTxType);
         let initialAmount = 0;
         if (initialTxs.length > 0) {
            initialAmount = initialTxs.reduce((acc: number, tx: any) => acc + Math.abs(Number(tx.amount)), 0);
         }

         // 2. Identify all repayment transactions (the opposite direction)
         const repaymentTxType = debt.type === 'lend' ? 'debt_in' : 'debt_out';
         const repaymentTxs = allTxs.filter((tx: any) => tx.type === repaymentTxType);

         let totalRepaid = 0;
         if (repaymentTxs.length > 0) {
            totalRepaid = repaymentTxs.reduce((acc: number, tx: any) => acc + Math.abs(Number(tx.amount)), 0);
         }

         const remainingAmount = Math.max(0, initialAmount - totalRepaid);

         return {
            id: debt.id,
            date: debt.date.toISOString(),
            type: debt.type,
            counterparty: debt.counterparty,
            description: debt.description,
            status: debt.status,
            amount: initialAmount,
            remaining_amount: remainingAmount,
            account: debt.account_rel,
            account_id: debt.account_id,
            repayments: repaymentTxs.map((tx: any) => ({
               id: tx.id,
               date: tx.date.toISOString(),
               description: tx.description,
               amount: Math.abs(Number(tx.amount)),
               account: tx.account
            })),
            transactions: allTxs.map((tx: any) => ({
               id: tx.id,
               type: tx.type,
               date: tx.date.toISOString(),
               description: tx.description,
               amount: Math.abs(Number(tx.amount)),
               account: tx.account
            }))
         };
      });

      // Handle in-memory sorting for 'amount'
      if (sortBy === 'amount') {
         transformedDebts.sort((a, b) => {
            if (sortOrder === 'asc') {
               return a.amount - b.amount;
            } else {
               return b.amount - a.amount;
            }
         });

         // Apply pagination manually after sorting
         if (limit > 0) {
            const startIndex = (page - 1) * limit;
            transformedDebts = transformedDebts.slice(startIndex, startIndex + limit);
         }
      }

      if (limit === 0) {
         return successResponse(transformedDebts);
      }

      const totalPages = Math.ceil(totalData / limit);

      return NextResponse.json({
         success: true,
         message: 'Debts retrieved successfully',
         data: transformedDebts,
         meta: {
            page,
            limit,
            total_data: totalData,
            total_pages: totalPages,
         }
      });
   } catch (error) {
      console.error('Fetch debts error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to retrieve debts', 500);
   }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const { user } = authResult;

   try {
      const body = await request.json();
      const validation = CreateDebtSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse(
            'VALIDATION_ERROR',
            'Validation failed',
            400,
            validation.error.errors
         );
      }

      const data = validation.data;

      // Verify account exists and belongs to user
      const account = await prisma.account.findFirst({
         where: {
            id: data.account_id,
            user_id: user.user_id,
            is_active: true,
         },
      });

      if (!account) {
         return errorResponse('NOT_FOUND', 'Active account not found or access denied', 404);
      }

      // Determine transaction logical amount based on type
      // LEND = money leaves account (debt_out, negative amount)
      // BORROW = money enters account (debt_in, positive amount)
      const txType = data.type === 'lend' ? 'debt_out' : 'debt_in';
      // Negative if lending, positive if borrowing
      const dbAmount = data.type === 'lend' ? -Math.abs(data.amount) : Math.abs(data.amount);

      // Perform database operations in transaction
      const newDebt = await prisma.$transaction(async (tx) => {
         // 1. Create the Debt entity itself
         const debtEntry = await tx.debt.create({
            data: {
               user_id: user.user_id,
               date: new Date(data.date),
               type: data.type,
               account_id: data.account_id,
               counterparty: data.counterparty,
               ...(data.description !== undefined ? { description: data.description } : {}),
               status: 'active',
               created_by: user.user_id,
            }
         });

         // 2. Create the linked Transaction
         await tx.transaction.create({
            data: {
               user_id: user.user_id,
               account_id: data.account_id,
               type: txType,
               amount: new Prisma.Decimal(dbAmount),
               currency: account.currency, // Use the currency of the account
               date: new Date(data.date),
               ...(data.description !== undefined
                  ? { description: data.description }
                  : { description: `Debt: ${data.type} with ${data.counterparty}` }),
               payee: data.counterparty,
               debt_id: debtEntry.id,   // Link backwards to the debt
               created_by: user.user_id,
            }
         });

         return await tx.debt.findUnique({
            where: { id: debtEntry.id },
            include: {
               account_rel: { select: { name: true, icon: true, color: true } },
               transactions: { orderBy: { created_at: 'asc' } }
            }
         });
      });

      return successResponse(
         {
            ...newDebt,
            amount: data.amount, // Directly attach amount for frontend immediate use
            remaining_amount: data.amount,
         },
         { message: 'Debt created successfully', code: 201 }
      );

   } catch (error) {
      console.error('Create debt error:', error);
      return errorResponse(
         'INTERNAL_ERROR',
         'Failed to create debt',
         500
      );
   }
}
