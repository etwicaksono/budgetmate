import { NextRequest, NextResponse } from 'next/server';
import type { Transaction, CreateTransactionRequest } from '@/types/database';

// Import your database client
// import { db } from '@/lib/db';

/**
 * Helper: Get current user ID from auth token
 * TODO: Implement based on your auth system
 */
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // TODO: Verify JWT token and extract user_id
  // Example with JWT:
  // try {
  //   const payload = jwt.verify(token, process.env.JWT_SECRET!);
  //   return payload.userId;
  // } catch (error) {
  //   return null;
  // }
  
  return 'c3cda74f-cb21-4aba-ac57-ffdd8e6b8979'; // Placeholder - replace with actual auth
}

/**
 * Helper: Get next personal_id for a user
 * This auto-increments the personal_id for each user's transactions
 */
async function getNextPersonalId(userId: string): Promise<number> {
  // TODO: Query database for max personal_id for this user
  // Example with Prisma:
  // const maxTransaction = await db.transaction.findFirst({
  //   where: { user_id: userId },
  //   orderBy: { personal_id: 'desc' },
  // });
  // return (maxTransaction?.personal_id || 0) + 1;
  
  return Date.now(); // Temporary placeholder
}

/**
 * Validation: Validate transaction data
 */
function validateTransactionData(data: unknown): data is CreateTransactionRequest {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.date === 'string' &&
    !isNaN(Date.parse(obj.date)) &&
    typeof obj.account_id === 'string' &&
    obj.account_id.length > 0 &&
    typeof obj.category_id === 'string' &&
    obj.category_id.length > 0 &&
    typeof obj.amount === 'number' &&
    obj.amount > 0 &&
    typeof obj.type === 'string' &&
    obj.type.length > 0 &&
    obj.position !== undefined // position is required in your schema
  );
}

/**
 * POST /api/transactions
 * Creates a new transaction
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    
    if (!validateTransactionData(body)) {
      return NextResponse.json(
        {
          error: 'Invalid transaction data',
          message: 'Please provide valid date, account_id, category_id, amount, type, and position',
        },
        { status: 400 }
      );
    }

    // 3. Get next personal_id
    const personalId = await getNextPersonalId(userId);

    // 4. Create transaction in database
    // TODO: Replace with actual database insert
    // Example with Prisma:
    // const transaction = await db.transaction.create({
    //   data: {
    //     id: generateUUID(), // Use uuid library
    //     user_id: userId,
    //     personal_id: personalId,
    //     date: new Date(body.date),
    //     account_id: body.account_id,
    //     category_id: body.category_id,
    //     amount: body.amount,
    //     type: body.type,
    //     note: body.note || null,
    //     position: body.position,
    //     transfer_id: body.transfer_id || null,
    //     debt_id: body.debt_id || null,
    //     created_at: new Date(),
    //     created_by: userId,
    //     updated_at: null,
    //     updated_by: null,
    //   },
    // });

    const newTransaction: Transaction = {
      id: generateId(),
      user_id: userId,
      personal_id: personalId,
      date: body.date,
      account_id: body.account_id,
      category_id: body.category_id,
      amount: body.amount,
      type: body.type,
      note: body.note || null,
      position: body.position,
      transfer_id: body.transfer_id || null,
      debt_id: body.debt_id || null,
      created_at: new Date().toISOString(),
      created_by: userId,
      updated_at: null,
      updated_by: null,
    };

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'The request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions
 * Retrieves transactions with filters
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('account_id');
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const minAmount = searchParams.get('min_amount');
    const maxAmount = searchParams.get('max_amount');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. Query database
    // TODO: Replace with actual database query
    // Example with Prisma:
    // const transactions = await db.transaction.findMany({
    //   where: {
    //     user_id: userId,
    //     ...(accountId && { account_id: accountId }),
    //     ...(categoryId && { category_id: categoryId }),
    //     ...(type && { type }),
    //     ...(startDate && { date: { gte: new Date(startDate) } }),
    //     ...(endDate && { date: { lte: new Date(endDate) } }),
    //     ...(minAmount && { amount: { gte: parseFloat(minAmount) } }),
    //     ...(maxAmount && { amount: { lte: parseFloat(maxAmount) } }),
    //     ...(search && { note: { contains: search, mode: 'insensitive' } }),
    //   },
    //   skip: offset,
    //   take: limit,
    //   orderBy: { date: 'desc' },
    //   include: {
    //     account: { select: { name: true } },
    //     category: { select: { name: true } },
    //   },
    // });
    //
    // const total = await db.transaction.count({
    //   where: { user_id: userId },
    // });

    // Mock response (replace with actual database query)
    const transactions: Transaction[] = [];
    const total = 0;

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);

    return NextResponse.json(
      { error: 'Internal server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper: Generate UUID (replace with proper UUID library like 'uuid')
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
