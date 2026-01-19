# FamilyFinance API Documentation

## Base URL

- Development: `http://localhost:8000`
- Staging: `https://api.staging.familyfinance.io`
- Production: `https://api.familyfinance.io`

## Authentication

FamilyFinance uses JWT (JSON Web Tokens) for authentication.

### Obtain Token

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=yourpassword
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Use Token

Include the token in the Authorization header:

```http
GET /api/v1/transactions
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## Endpoints

### Health & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Readiness probe (includes DB) |
| GET | `/health/live` | Liveness probe |
| GET | `/health/detailed` | Detailed health with metrics |
| GET | `/metrics` | Prometheus metrics |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get token |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/transactions` | List transactions |
| POST | `/api/v1/transactions` | Create transaction |
| GET | `/api/v1/transactions/{id}` | Get transaction |
| PUT | `/api/v1/transactions/{id}` | Update transaction |
| DELETE | `/api/v1/transactions/{id}` | Delete transaction |
| POST | `/api/v1/transactions/{id}/attachment` | Upload receipt |

#### Query Parameters (List)

| Parameter | Type | Description |
|-----------|------|-------------|
| `skip` | int | Pagination offset (default: 0) |
| `limit` | int | Page size (default: 20, max: 100) |
| `type` | string | Filter by type: `income`, `expense` |
| `category_id` | uuid | Filter by category |
| `start_date` | date | Filter from date |
| `end_date` | date | Filter to date |
| `min_amount` | decimal | Minimum amount |
| `max_amount` | decimal | Maximum amount |

### Goals (Cochinitos)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/goals` | List goals |
| POST | `/api/v1/goals` | Create goal |
| GET | `/api/v1/goals/{id}` | Get goal |
| PUT | `/api/v1/goals/{id}` | Update goal |
| DELETE | `/api/v1/goals/{id}` | Delete goal |
| POST | `/api/v1/goals/{id}/contribute` | Add contribution |
| GET | `/api/v1/goals/{id}/contributions` | List contributions |

### Debts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/debts` | List debts |
| POST | `/api/v1/debts` | Create debt |
| GET | `/api/v1/debts/{id}` | Get debt |
| PUT | `/api/v1/debts/{id}` | Update debt |
| DELETE | `/api/v1/debts/{id}` | Delete debt |
| POST | `/api/v1/debts/{id}/payment` | Record payment |
| POST | `/api/v1/debts/{id}/adjustment` | Add adjustment |
| GET | `/api/v1/debts/{id}/payments` | List payments |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stats/summary` | Dashboard summary |
| GET | `/api/v1/stats/by-category` | Spending by category |
| GET | `/api/v1/stats/monthly` | Monthly trends |
| GET | `/api/v1/stats/balance` | Current balance |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/settings` | Get user settings |
| PUT | `/api/v1/settings` | Update user settings |
| GET | `/api/v1/settings/family` | Get family settings |
| PUT | `/api/v1/settings/family` | Update family settings |
| GET | `/api/v1/settings/categories` | List categories |
| POST | `/api/v1/settings/categories` | Create category |

---

## Request/Response Examples

### Create Transaction

```http
POST /api/v1/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "expense",
  "amount": 150.50,
  "currency": "MXN",
  "category_id": "uuid-here",
  "description": "Grocery shopping",
  "date": "2024-01-15",
  "notes": "Weekly groceries at Walmart"
}
```

Response (201 Created):
```json
{
  "id": "uuid-here",
  "type": "expense",
  "amount": 150.50,
  "currency": "MXN",
  "category": {
    "id": "uuid-here",
    "name": "Groceries",
    "icon": "shopping_cart"
  },
  "description": "Grocery shopping",
  "date": "2024-01-15",
  "notes": "Weekly groceries at Walmart",
  "attachment_url": null,
  "created_at": "2024-01-15T10:30:00Z",
  "created_by": {
    "id": "uuid-here",
    "name": "John Doe"
  }
}
```

### Create Goal

```http
POST /api/v1/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vacation Fund",
  "target_amount": 50000.00,
  "currency": "MXN",
  "target_date": "2024-12-31",
  "is_personal": false,
  "icon": "beach_access",
  "color": "#4CAF50"
}
```

### Record Debt Payment

```http
POST /api/v1/debts/{debt_id}/payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000.00,
  "currency": "MXN",
  "date": "2024-01-15",
  "notes": "January payment"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error description",
  "code": "ERROR_CODE",
  "field": "field_name"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

### Validation Error Example

```json
{
  "detail": [
    {
      "loc": ["body", "amount"],
      "msg": "value is not a valid decimal",
      "type": "type_error.decimal"
    }
  ]
}
```

---

## Rate Limiting

- General API: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

When rate limited (429):
```json
{
  "detail": "Rate limit exceeded"
}
```

---

## Pagination

List endpoints support pagination:

```http
GET /api/v1/transactions?skip=0&limit=20
```

Response includes:
```json
{
  "items": [...],
  "total": 150,
  "skip": 0,
  "limit": 20
}
```

---

## Multi-Currency Support

All monetary amounts support multiple currencies:
- `MXN` - Mexican Peso (default)
- `USD` - US Dollar
- `EUR` - Euro

Exchange rates are fetched automatically when needed.

```json
{
  "amount": 100.00,
  "currency": "USD",
  "amount_mxn": 1720.50
}
```

---

## Webhooks (Future)

Planned webhook events:
- `transaction.created`
- `goal.completed`
- `debt.paid_off`
- `budget.exceeded`

---

## SDK Examples

### Python

```python
import httpx

client = httpx.Client(
    base_url="https://api.familyfinance.io",
    headers={"Authorization": f"Bearer {token}"}
)

# List transactions
response = client.get("/api/v1/transactions", params={"limit": 10})
transactions = response.json()

# Create transaction
response = client.post("/api/v1/transactions", json={
    "type": "expense",
    "amount": 150.50,
    "category_id": "uuid-here",
    "description": "Test"
})
```

### JavaScript/TypeScript

```typescript
const api = axios.create({
  baseURL: 'https://api.familyfinance.io',
  headers: { Authorization: `Bearer ${token}` }
});

// List transactions
const { data } = await api.get('/api/v1/transactions', {
  params: { limit: 10 }
});

// Create transaction
await api.post('/api/v1/transactions', {
  type: 'expense',
  amount: 150.50,
  category_id: 'uuid-here',
  description: 'Test'
});
```

### Dart/Flutter

```dart
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.familyfinance.io',
  headers: {'Authorization': 'Bearer $token'},
));

// List transactions
final response = await dio.get('/api/v1/transactions',
  queryParameters: {'limit': 10});

// Create transaction
await dio.post('/api/v1/transactions', data: {
  'type': 'expense',
  'amount': 150.50,
  'category_id': 'uuid-here',
  'description': 'Test',
});
```
