# API Documentation — Auto-Like

Base URL: `http://localhost:3001`

---

## Authentication

### POST /auth/register
- **Body:** `{ username, password }`
- **Response:** `{ success, token, user: { id, username, role, balance } }`
- **Errors:** 400 (username taken), 400 (validation)

### POST /auth/login
- **Body:** `{ username, password }`
- **Response:** `{ success, token, user: { id, username, role, balance, display_name } }`
- **Errors:** 401 (invalid credentials)

### GET /auth/me
- **Auth:** Bearer token required
- **Response:** `{ success, user: { id, username, role, balance, display_name, email, phone } }`

### PUT /auth/profile
- **Auth:** Bearer token required
- **Body:** `{ display_name?, email?, phone? }`
- **Response:** `{ success, user }`
- **Errors:** 400 (duplicate email/phone)

### PUT /auth/password
- **Auth:** Bearer token required
- **Body:** `{ currentPassword, newPassword }`
- **Response:** `{ success, message }`
- **Errors:** 400 (wrong current password), 400 (min length)

---

## Services (Proxied to BaoStar)

### GET /api/prices
- **Public**
- **Response:** `{ success, data: [{ path, name, package: [{ id, name, package_name, price_per, min, max, notes }] }] }`

### POST /api/orders
- **Auth:** Bearer token required
- **Body:** `{ endpoint, service_id, ...serviceParams }`
- **Response:** `{ success, order_id, message }`
- **Errors:** 400 (insufficient balance), 401 (not authenticated)

### POST /api/logs-order
- **Auth:** Bearer token required
- **Body:** `{ type, list_ids }`
- **Response:** BaoStar order log data

### POST /api/convert-uid
- **Public**
- **Body:** `{ link, type? }`
- **Response:** `{ data: "numeric_uid" }`

---

## Statistics

### GET /api/orders/stats
- **Auth:** Bearer token required
- **Response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 0,
    "total_spent": 0,
    "total_deposits": 0,
    "total_refunds": 0,
    "failed_orders": 0,
    "spending_by_service": []
  }
}
```

---

## Admin

### GET /admin/users
- **Auth:** Admin required
- **Query:** `?search=&page=1&limit=20`
- **Response:** `{ success, users[], total, page, totalPages }`

### PUT /admin/users/:id/balance
- **Auth:** Admin required
- **Body:** `{ amount, type: "add"|"subtract", note? }`
- **Response:** `{ success, new_balance }`

### PUT /admin/users/:id/role
- **Auth:** Admin required
- **Body:** `{ role: "user"|"admin" }`
- **Response:** `{ success }`
