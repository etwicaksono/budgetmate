import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, commonErrors } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';
import { UpdateTransactionSchema } from '@/lib/validation/transaction';

interface RouteParams {
  params?: {
    id?: string;
  };
}

// GET - Fetch single transaction
export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const transactionId = resolveRouteParam(request, context.params);
  if (!transactionId) {
    return errorResponse('VALIDATION_ERROR', 'Transaction ID is required in the path', 400);
  }
  
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
        deleted_at: null
      },
      include: {
        category: {
          select: { 
            id: true,
            name: true, 
            icon: true, 
            color: true,
            type: true,
            parent: {
              select: { id: true, name: true }
            }
          }
        },
        account: {
          select: { 
            id: true,
            name: true,
            icon: true,
            color: true,
            currency: true,
            account_type: true
          }
        },
        labels: {
          include: {
            label: {
              select: { 
                id: true, 
                name: true, 
                color: true 
              }
            }
          }
        },
        transfer: {
          select: {
            id: true,
            from_account: true,
            to_account: true,
            amount: true,
            to_amount: true,
            description: true,
            currency: true,
            to_currency: true
          }
        }
      }
    });
    
    if (!transaction) {
      return commonErrors.notFound('Transaction');
    }
    
    const baseResponse = {
      id: transaction.id,
      personal_id: Number(transaction.personal_id),
      date: transaction.date,
      account_id: transaction.account_id,
      account: transaction.account,
      category_id: transaction.category_id,
      category: transaction.category,
      amount: transaction.amount.toNumber(),
      type: transaction.type,
      description: transaction.description,
      currency: transaction.currency,
      exchange_rate: transaction.exchange_rate.toNumber(),
      payee: transaction.payee,
      payment_method: transaction.payment_method,
      payment_status: transaction.payment_status,
      reference_number: transaction.reference_number,
      is_recurring: transaction.is_recurring,
      transfer_id: transaction.transfer_id,
      labels: transaction.labels.map(l => l.label),
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    };

    // Add transfer-specific fields if this is a transfer transaction
    const response = transaction.transfer ? {
      ...baseResponse,
      to_account_id: transaction.transfer.to_account,
      to_amount: transaction.transfer.to_amount?.toNumber() || transaction.transfer.amount.toNumber(),
      from_account_id: transaction.transfer.from_account,
      transfer_description: transaction.transfer.description,
      transfer_currency: transaction.transfer.currency,
      to_currency: transaction.transfer.to_currency || transaction.transfer.currency,
      transfer: transaction.transfer
    } : baseResponse;
    
    return successResponse(response);
    
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch transaction', 500);
  }
}

// PUT/PATCH - Update transaction
export async function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const transactionId = resolveRouteParam(request, context.params);
  if (!transactionId) {
    return errorResponse('VALIDATION_ERROR', 'Transaction ID is required in the path', 400);
  }
  
  try {
    const body = await request.json();
    const validation = UpdateTransactionSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }
    
    const data = validation.data;
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
        deleted_at: null
      }
    });
    
    if (!existingTransaction) {
      return commonErrors.notFound('Transaction');
    }
    
    // If updating account, verify it belongs to user
    if (data.account_id) {
      const account = await prisma.account.findFirst({
        where: {
          id: data.account_id,
          user_id: user.user_id,
          is_active: true,
          deleted_at: null
        }
      });
      
      if (!account) {
        return errorResponse('INVALID_ACCOUNT', 'Account not found or inactive', 404);
      }
    }
    
    // If updating category, verify it belongs to user and matches type
    if (data.category_id || data.type) {
      const categoryId = data.category_id ?? existingTransaction.category_id;
      const type = data.type ?? existingTransaction.type;
      
      if (categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: categoryId,
            user_id: user.user_id,
            is_active: true
          }
        });
        
        if (!category) {
          return errorResponse('INVALID_CATEGORY', 'Category not found or inactive', 404);
        }
        
        if (category.type !== type) {
          return errorResponse(
            'CATEGORY_TYPE_MISMATCH',
            `Category type '${category.type}' does not match transaction type '${type}'`,
            400
          );
        }
      }
    }
    
    // Calculate the final amount based on type
    let finalAmount: number | undefined;
    if (data.amount !== undefined || data.type !== undefined) {
      const amount = data.amount ?? Math.abs(existingTransaction.amount.toNumber());
      const type = data.type ?? existingTransaction.type;
      finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    }
    
    // Build update data
    const updateData: Prisma.TransactionUpdateInput = {
      updated_at: new Date(),
      updated_by: user.user_id,
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.account_id !== undefined && { account_id: data.account_id }),
      ...(data.category_id !== undefined && { category_id: data.category_id }),
      ...(finalAmount !== undefined && { amount: finalAmount }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.payee !== undefined && { payee: data.payee || null }),
      ...(data.payment_method !== undefined && { payment_method: data.payment_method || null }),
      ...(data.payment_status !== undefined && { payment_status: data.payment_status || null }),
      ...(data.reference_number !== undefined && { reference_number: data.reference_number || null }),
    };
    
    let updated;
    try {
      updated = await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          category: {
            select: { name: true, icon: true, color: true }
          },
          account: {
            select: { name: true, icon: true, color: true }
          }
        }
      });
    } catch (prismaError: unknown) {
      if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma update error:', prismaError.code, prismaError.message);
        if (prismaError.code === 'P2025') {
          return commonErrors.notFound('Transaction');
        }
        if (prismaError.code === 'P2003') {
          const field = (prismaError.meta?.['field_name'] as string | undefined) ?? '';
          if (field.includes('account_id')) {
            return errorResponse('INVALID_ACCOUNT', 'Account not found or inactive', 404);
          }
          if (field.includes('category_id')) {
            return errorResponse('INVALID_CATEGORY', 'Category not found or inactive', 404);
          }
        }
      } else {
        console.error('Prisma update unknown error:', prismaError);
      }
      throw prismaError;
    }
    
    // Handle label updates if provided
    if (data.label_ids !== undefined) {
      try {
        // Remove existing labels
        await prisma.transactionLabel.deleteMany({
          where: { transaction_id: transactionId }
        });
        
        // Add new labels
        if (data.label_ids.length > 0) {
          // Verify labels belong to user
          const labels = await prisma.label.findMany({
            where: {
              id: { in: data.label_ids },
              user_id: user.user_id
            }
          });
          
          if (labels.length !== data.label_ids.length) {
            return errorResponse('INVALID_LABEL', 'One or more labels not found', 404);
          }
          
          await prisma.transactionLabel.createMany({
            data: data.label_ids.map(label_id => ({
              transaction_id: transactionId,
              label_id
            }))
          });
        }
      } catch (labelError) {
        console.error('Label update error:', labelError);
        // Continue anyway - label update failure shouldn't fail the whole update
      }
    }
    
    const response = {
      id: updated.id,
      personal_id: Number(updated.personal_id),
      date: updated.date,
      account_id: updated.account_id,
      account: updated.account,
      category_id: updated.category_id,
      category: updated.category,
      amount: updated.amount.toNumber(),
      type: updated.type,
      description: updated.description,
      currency: updated.currency,
      payee: updated.payee,
      payment_method: updated.payment_method,
      payment_status: updated.payment_status,
      reference_number: updated.reference_number,
      updated_at: updated.updated_at
    };
    
    return successResponse(response, { message: 'Transaction updated successfully' });
    
    /* OLD CODE WITH BALANCE ADJUSTMENT - Will re-enable later
    const updated_old = await prisma.$transaction(async (tx) => {
      const skipBalanceAdjustment = true;
      
      if (!skipBalanceAdjustment && (finalAmount !== undefined || data.account_id)) {
        const oldAmount = existingTransaction.amount.toNumber();
        const newAmount = finalAmount ?? oldAmount;
        const oldAccountId = existingTransaction.account_id;
        const newAccountId = data.account_id ?? oldAccountId;
        
        console.log('Balance adjustment:', {
          oldAmount,
          newAmount,
          oldAccountId,
          newAccountId,
          finalAmount
        });
        
        // ✅ Balance is now calculated on-demand, no need to update
      }
      
      // Update transaction
      const updateData: any = {
        updated_at: new Date(),
        updated_by: user.user_id
      };
      
      if (data.date) updateData.date = new Date(data.date);
      if (data.account_id) updateData.account_id = data.account_id;
      if (data.category_id !== undefined) updateData.category_id = data.category_id;
      if (finalAmount !== undefined) updateData.amount = finalAmount;
      if (data.type) updateData.type = data.type;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.payee !== undefined) updateData.payee = data.payee;
      if (data.payment_method !== undefined) updateData.payment_method = data.payment_method;
      if (data.payment_status !== undefined) updateData.payment_status = data.payment_status;
      if (data.reference_number !== undefined) updateData.reference_number = data.reference_number;
      
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      console.log('Transaction ID:', id);
      
      const updated = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: { name: true, icon: true, color: true }
          },
          account: {
            select: { name: true, icon: true, color: true }
          }
        }
      });
      
      // Update labels if provided
      if (data.label_ids !== undefined) {
        // Remove existing labels
        await tx.transactionLabel.deleteMany({
          where: { transaction_id: id }
        });
        
        // Add new labels
        if (data.label_ids.length > 0) {
          // Verify labels belong to user
          const labels = await tx.label.findMany({
            where: {
              id: { in: data.label_ids },
              user_id: user.user_id
            }
          });
          
          if (labels.length !== data.label_ids.length) {
            throw new Error('One or more labels not found');
          }
          
          await tx.transactionLabel.createMany({
            data: data.label_ids.map(label_id => ({
              transaction_id: id,
              label_id
            }))
          });
        }
      }
      
      return updated_old;
    });
    
    const response_old = {
      id: updated_old.id,
      personal_id: Number(updated_old.personal_id),
      date: updated_old.date,
      account_id: updated_old.account_id,
      account: updated_old.account,
      category_id: updated_old.category_id,
      category: updated_old.category,
      amount: updated_old.amount.toNumber(),
      type: updated_old.type,
      description: updated_old.description,
      currency: updated_old.currency,
      payee: updated_old.payee,
      payment_method: updated_old.payment_method,
      payment_status: updated_old.payment_status,
      reference_number: updated_old.reference_number,
      updated_at: updated_old.updated_at
    };
    
    return successResponse(response_old, { message: 'Transaction updated successfully (old)' });
    */
    
  } catch (error) {
    console.error('Transaction update error:', error);
    
    if (error instanceof Error && error.message === 'One or more labels not found') {
      return errorResponse('INVALID_LABEL', error.message, 404);
    }
    
    return errorResponse('INTERNAL_ERROR', 'Failed to update transaction', 500);
  }
}

// PATCH - Alias for PUT
export async function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return PUT(request, context);
}

// DELETE - Soft delete transaction
export async function DELETE(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const transactionId = resolveRouteParam(request, context.params);
  if (!transactionId) {
    return errorResponse('VALIDATION_ERROR', 'Transaction ID is required in the path', 400);
  }
  
  try {
    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
        deleted_at: null
      }
    });
    
    if (!existingTransaction) {
      return commonErrors.notFound('Transaction');
    }
    
    // Check if this is a transfer transaction (has transfer_id)
    const transferId = existingTransaction.transfer_id;
    if (transferId) {
      // Delete the entire transfer (which includes both transactions)
      await prisma.$transaction(async (tx) => {
        // Soft delete all transactions linked to this transfer
        await tx.transaction.updateMany({
          where: { 
            transfer_id: transferId,
            deleted_at: null
          },
          data: {
            deleted_at: new Date(),
            updated_at: new Date(),
            updated_by: user.user_id
          }
        });
        
        // Soft delete the transfer record
        await tx.transfer.update({
          where: { id: transferId },
          data: {
            updated_at: new Date(),
            updated_by: user.user_id
          }
        });
      });
      
      return successResponse(null, { message: 'Transfer deleted successfully' });
    }
    
    // Regular transaction - just delete this one
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: user.user_id
      }
    });
    
    return successResponse(null, { message: 'Transaction deleted successfully' });
    
  } catch (error) {
    console.error('Transaction deletion error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete transaction', 500);
  }
}
