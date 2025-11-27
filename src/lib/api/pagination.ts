import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Extract pagination params from request
export function getPaginationParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams;
  
  let page = parseInt(searchParams.get('page') || String(DEFAULT_PAGE));
  let limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT));
  
  // Validate and sanitize
  page = Math.max(1, isNaN(page) ? DEFAULT_PAGE : page);
  limit = Math.min(MAX_LIMIT, Math.max(1, isNaN(limit) ? DEFAULT_LIMIT : limit));
  
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

// Create pagination metadata
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

// Sort parameters
export interface SortParams {
  orderBy: Record<string, 'asc' | 'desc'>;
}

// Extract sort params from request
export function getSortParams(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'created_at',
  defaultOrder: 'asc' | 'desc' = 'desc'
): SortParams {
  const searchParams = request.nextUrl.searchParams;
  const sortBy = searchParams.get('sort_by') || defaultField;
  const sortOrder = (searchParams.get('sort_order') || defaultOrder) as 'asc' | 'desc';
  
  // Validate sort field
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : defaultOrder;
  
  return {
    orderBy: { [field]: order }
  };
}

// Filter parameters
export interface FilterParams {
  where: Record<string, unknown>;
}

// Extract date range filter
export function getDateRangeFilter(
  request: NextRequest,
  field: string = 'date'
): Record<string, unknown> | undefined {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  
  if (!startDate && !endDate) {
    return undefined;
  }
  
  const filter: Record<string, unknown> = {};
  
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) {
      filter['gte'] = start;
    }
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      // Set to end of day
      end.setHours(23, 59, 59, 999);
      filter['lte'] = end;
    }
  }
  
  return Object.keys(filter).length > 0 ? { [field]: filter } : undefined;
}

// Extract search query
export function getSearchQuery(
  request: NextRequest,
  fields: string[]
): Record<string, unknown> | undefined {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('search');
  
  if (!query || query.trim() === '') {
    return undefined;
  }
  
  const searchTerm = query.trim();
  
  // Create OR condition for multiple fields
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }))
  };
}

// Build complete filter object
export function buildFilters(
  request: NextRequest,
  options: {
    searchFields?: string[];
    dateField?: string;
    customFilters?: Record<string, unknown>;
  } = {}
): Record<string, unknown> {
  const filters: Record<string, unknown>[] = [];
  
  // Add search filter
  if (options.searchFields) {
    const searchFilter = getSearchQuery(request, options.searchFields);
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }
  
  // Add date range filter
  if (options.dateField) {
    const dateFilter = getDateRangeFilter(request, options.dateField);
    if (dateFilter) {
      filters.push(dateFilter);
    }
  }
  
  // Add custom filters
  if (options.customFilters) {
    filters.push(options.customFilters);
  }
  
  // Combine all filters with AND
  return filters.length > 0
    ? filters.length === 1
      ? filters[0] ?? {}
      : { AND: filters }
    : {};
}
