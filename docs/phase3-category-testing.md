# Phase 3: Category Management Testing Guide

## Overview
This guide provides test commands and expected responses for the category management endpoints implemented in Phase 3.

## Prerequisites
- Phase 1 (Authentication) completed
- User registered and logged in
- Access token obtained from login
- Database running at `localhost:5432`
- Next.js dev server running: `npm run dev`

## Base URL
All endpoints are at: `http://localhost:3000/api/v1/categories`

## Authentication
All endpoints require authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

---

## 1. List Categories

**Endpoint:** `GET /api/v1/categories`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**With Search:**
```bash
curl -X GET "http://localhost:3000/api/v1/categories?keyword=food&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": "uuid-here",
      "user_id": "user-uuid",
      "personal_id": 1,
      "parent_id": null,
      "name": "Food & Dining",
      "icon": "🍔",
      "color": "#FF5722",
      "nature": "NEED",
      "is_active": true,
      "position": null,
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  ],
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999,
    "max_personal_id": 1,
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

**Query Parameters:**
- `keyword` - Search categories by name (case-insensitive)
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

---

## 2. Create Category

**Endpoint:** `POST /api/v1/categories`

**Create Root Category:**
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 2,
    "name": "Transportation",
    "icon": "🚗",
    "color": "#2196F3",
    "nature": "NEED",
    "is_active": true,
    "parent_id": null
  }'
```

**Create Child Category:**
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 3,
    "name": "Fuel",
    "icon": "⛽",
    "color": "#FF9800",
    "nature": "NEED",
    "is_active": true,
    "parent_id": "PARENT_CATEGORY_UUID"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "new-uuid",
    "user_id": "user-uuid",
    "personal_id": 2,
    "parent_id": null,
    "name": "Transportation",
    "icon": "🚗",
    "color": "#2196F3",
    "nature": "NEED",
    "is_active": true,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Required Fields:**
- `personal_id` - Integer (from cache, incremental)
- `name` - String (max 36 chars)
- `icon` - String (emoji or icon name)

**Optional Fields:**
- `color` - String (hex color code)
- `nature` - String (NEED, WANT, MUST - default: NEED)
- `parent_id` - String (parent category UUID)
- `is_active` - Boolean (default: true)

**Error Cases:**
- `400`: Missing required fields
- `404`: Parent category not found
- `409`: Duplicate personal_id for this user

---

## 3. Get Category Tree

**Endpoint:** `GET /api/v1/categories/tree`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/categories/tree \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Category tree retrieved successfully",
  "data": [
    {
      "id": "uuid-1",
      "user_id": "user-uuid",
      "personal_id": 1,
      "parent_id": null,
      "name": "Food & Dining",
      "icon": "🍔",
      "color": "#FF5722",
      "nature": "NEED",
      "is_active": true,
      "position": null,
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T...",
      "children": [
        {
          "id": "uuid-2",
          "parent_id": "uuid-1",
          "name": "Restaurants",
          "icon": "🍽️",
          "color": "#E91E63",
          "nature": "WANT",
          "is_active": true,
          "children": []
        },
        {
          "id": "uuid-3",
          "parent_id": "uuid-1",
          "name": "Groceries",
          "icon": "🛒",
          "color": "#4CAF50",
          "nature": "NEED",
          "is_active": true,
          "children": []
        }
      ]
    }
  ],
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999,
    "total": 3
  }
}
```

**Use Case:**
- Display hierarchical category structure in UI
- Build nested category dropdowns
- Visualize category relationships

---

## 4. Get Category Detail

**Endpoint:** `GET /api/v1/categories/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/categories/CATEGORY_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "personal_id": 1,
    "parent_id": null,
    "name": "Food & Dining",
    "icon": "🍔",
    "color": "#FF5722",
    "nature": "NEED",
    "is_active": true,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `404`: Category not found or doesn't belong to user

---

## 5. Update Category

**Endpoint:** `PUT /api/v1/categories/:id`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/categories/CATEGORY_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Food & Beverages",
    "color": "#FF6B6B",
    "nature": "MUST"
  }'
```

**Change Parent (Move to Different Parent):**
```bash
curl -X PUT http://localhost:3000/api/v1/categories/CATEGORY_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "NEW_PARENT_UUID"
  }'
```

**Make Root Category (Remove Parent):**
```bash
curl -X PUT http://localhost:3000/api/v1/categories/CATEGORY_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": null
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "personal_id": 1,
    "parent_id": null,
    "name": "Food & Beverages",
    "icon": "🍔",
    "color": "#FF6B6B",
    "nature": "MUST",
    "is_active": true,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Updatable Fields:**
- `name`, `icon`, `color`
- `nature` (NEED, WANT, MUST)
- `parent_id` (change parent or set null for root)
- `is_active`

**Note:** `personal_id` cannot be updated directly (use swap-order)

**Error Cases:**
- `400`: Category cannot be its own parent (circular reference)
- `404`: Category not found or parent not found

---

## 6. Delete Category

**Endpoint:** `DELETE /api/v1/categories/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/categories/CATEGORY_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": null,
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `404`: Category not found or doesn't belong to user
- `400`: Cannot delete category with child categories
- `400`: Cannot delete category with existing transactions

---

## 7. Swap Category Order

**Endpoint:** `PUT /api/v1/categories/swap-order`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/categories/swap-order \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_map": [
      { "id": "category-uuid-1", "personal_id": 1 },
      { "id": "category-uuid-2", "personal_id": 2 },
      { "id": "category-uuid-3", "personal_id": 3 }
    ]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Categories reordered successfully",
  "data": {
    "updated_count": 3
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**How It Works:**
1. Send all categories with their new personal_id order
2. Server uses two-phase update to avoid unique constraint violations
3. Phase 1: Set temporary negative values
4. Phase 2: Set final positive values

**Error Cases:**
- `400`: Invalid order_map format
- `404`: One or more categories not found

---

## Testing Checklist

### Create Scenarios
- [ ] Create root category
- [ ] Create child category
- [ ] Create category with all optional fields
- [ ] Create category with duplicate personal_id (should fail 409)
- [ ] Create child with non-existent parent (should fail 404)
- [ ] Create without authentication (should fail 401)

### Read Scenarios
- [ ] List all categories (empty state)
- [ ] List all categories (with data)
- [ ] Search categories by keyword
- [ ] Get category tree (hierarchical structure)
- [ ] Get category detail by ID
- [ ] Get non-existent category (should fail 404)

### Update Scenarios
- [ ] Update category name and icon
- [ ] Update category color
- [ ] Change category nature (NEED → WANT → MUST)
- [ ] Change parent (move to different parent)
- [ ] Make child category a root (set parent_id to null)
- [ ] Make root category a child (set parent_id)
- [ ] Try to set category as its own parent (should fail 400)
- [ ] Toggle is_active status

### Delete Scenarios
- [ ] Delete category without children
- [ ] Delete category with children (should fail 400)
- [ ] Delete category with transactions (should fail 400)
- [ ] Delete non-existent category (should fail 404)

### Reorder Scenarios
- [ ] Swap order of 2 categories
- [ ] Reorder multiple categories (3+)
- [ ] Verify no unique constraint violations
- [ ] Verify all categories updated

### Hierarchy Scenarios
- [ ] Create 2-level hierarchy (parent → child)
- [ ] Create 3-level hierarchy (parent → child → grandchild)
- [ ] Move child from one parent to another
- [ ] Convert child to root category
- [ ] Convert root to child category
- [ ] Verify tree structure after changes

---

## Category Nature Types

Categories support three nature types:

1. **NEED** - Essential expenses (groceries, utilities, rent)
2. **WANT** - Non-essential desires (entertainment, dining out)
3. **MUST** - Mandatory fixed expenses (insurance, subscriptions)

This helps with budgeting and expense categorization.

---

## personal_id Caching Strategy

The client should cache `max_category_personal_id` for creating new categories:

### On Fetch Categories:
```javascript
const categories = await categoryService.fetchCategories();
// Service automatically updates localStorage: 'max_category_personal_id'
```

### On Create Category:
```javascript
const nextId = categoryService.getNextPersonalId(); // Gets cached value + 1

await categoryService.createCategory({
  personal_id: nextId,
  name: "New Category",
  icon: "📁",
  color: "#9C27B0",
  nature: "NEED",
  is_active: true,
  parent_id: null, // or parent UUID
});
```

### Cache Storage:
- **Key:** `max_category_personal_id`
- **Location:** `localStorage`
- **Updated:** After every `fetchCategories()` and `createCategory()`

---

## Integration with Client

The `categoryService.ts` has been updated for the new API:

```typescript
// List categories
const categories = await categoryService.fetchCategories();

// Search categories
const results = await categoryService.fetchCategories({ keyword: 'food' });

// Create category
const result = await categoryService.createCategory({
  personal_id: categoryService.getNextPersonalId(),
  name: "Entertainment",
  icon: "🎮",
  color: "#E91E63",
  nature: "WANT",
  is_active: true,
  parent_id: null,
});

// Update category
const updated = await categoryService.updateCategory(categoryId, {
  name: "Updated Name",
  color: "#FF5722",
  nature: "MUST",
});

// Delete category
await categoryService.deleteCategory(categoryId);

// Swap order
await categoryService.swapCategoryOrder({
  order_map: [
    { id: "uuid-1", personal_id: 1 },
    { id: "uuid-2", personal_id: 2 },
  ],
});
```

---

## Database Schema Reference

```sql
CREATE TABLE categories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  personal_id BIGINT NOT NULL,
  parent_id VARCHAR(36),
  name VARCHAR(36) NOT NULL,
  icon VARCHAR(36) NOT NULL,
  color VARCHAR(36),
  nature VARCHAR(8) NOT NULL,
  is_active BOOLEAN NOT NULL,
  position JSON,
  created_at DATE NOT NULL,
  updated_at DATE,
  UNIQUE(personal_id, user_id),
  FOREIGN KEY (parent_id) REFERENCES categories(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Key Points:**
- `personal_id` is unique per user (not globally)
- `parent_id` can be null (root category)
- `position` is nullable (for future Google Sheets sync)
- `nature` values: NEED, WANT, MUST

---

## Troubleshooting

### Issue: Unique constraint violation on personal_id

**Cause:** Client sent duplicate personal_id

**Solution:**
1. Clear cache: `localStorage.removeItem('max_category_personal_id')`
2. Fetch categories to rebuild cache
3. Try creating again

### Issue: Cannot delete category

**Cause:** Category has children or transactions

**Solution:**
1. Check if category has children: Get tree and verify
2. Check if category has transactions: Look at transaction count
3. Either delete children first or reassign transactions

### Issue: Circular reference error

**Cause:** Trying to set category as its own parent

**Solution:**
1. Verify parent_id is not the same as category id
2. Check the entire parent chain for loops

### Issue: Tree structure not updating

**Cause:** Browser caching

**Solution:**
1. Fetch categories list to update cache
2. Fetch tree endpoint to get latest structure
3. Clear browser cache if needed

---

## Next Steps

After Phase 3 is complete:
1. ✅ Test all category endpoints
2. ✅ Verify client integration
3. ✅ Test UI category management features
4. 🔄 Proceed to Phase 5: Transaction Management

---

## Phase 3 Summary

**7 Endpoints Implemented:**
- GET /api/v1/categories (list)
- POST /api/v1/categories (create)
- GET /api/v1/categories/:id (get detail)
- PUT /api/v1/categories/:id (update)
- DELETE /api/v1/categories/:id (delete)
- GET /api/v1/categories/tree (hierarchy)
- PUT /api/v1/categories/swap-order (reorder)

**Key Features:**
- ✅ Hierarchical parent-child relationships
- ✅ Category nature types (NEED/WANT/MUST)
- ✅ personal_id caching strategy
- ✅ Tree structure endpoint
- ✅ Prevents circular references
- ✅ Two-phase swap order
- ✅ Data integrity checks
