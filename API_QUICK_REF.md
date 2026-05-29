# Cords API Quick Reference

## Base URL
```
http://localhost:5000/api
```

## Headers
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "buyer|supplier|delivery",
  "phone": "+1234567890"
}
```
**Response:** `201` + JWT token

### POST /auth/login
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** `200` + JWT token

### POST /auth/refresh-token
Refresh JWT token (requires auth)
**Response:** `200` + new JWT token

---

## 👤 User Endpoints

### GET /users/profile
Get logged-in user's profile (requires auth)
**Response:** `200` User object

### PUT /users/profile
Update user profile (requires auth)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "bio": "Bio text"
}
```
**Response:** `200` Updated user

### GET /users/:id
Get user by ID (public)
**Response:** `200` User object

---

## 🌲 Product Endpoints

### GET /products/nearby
Find nearby wood products
```
Query: ?latitude=40.7128&longitude=-74.0060&radius=50&woodType=Oak
```
**Response:** `200` Array of products with distance

### GET /products/price/average
Get average price for wood type in area
```
Query: ?woodType=Oak&latitude=40.7128&longitude=-74.0060&radius=50
```
**Response:** `200` 
```json
{
  "wood_type": "Oak",
  "avg_price": 48.50,
  "min_price": 45.00,
  "max_price": 52.00,
  "supplier_count": 3
}
```

### POST /products
Create wood product (supplier only, requires auth)
```json
{
  "woodType": "Oak",
  "quantity": 100,
  "unit": "cord",
  "pricePerUnit": 50.00,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "description": "Premium oak wood"
}
```
**Response:** `201` Product object

### GET /products/:id
Get product details
**Response:** `200` Product object

### GET /products/supplier/:supplierId
Get all products from supplier
**Response:** `200` Array of products

### PUT /products/:id
Update product (supplier only, requires auth)
```json
{
  "quantity": 150,
  "pricePerUnit": 55.00,
  "active": true
}
```
**Response:** `200` Updated product

---

## 📦 Order Endpoints

### POST /orders
Create order (buyer only, requires auth)
```json
{
  "productId": 1,
  "quantity": 10,
  "deliveryLocation": {
    "latitude": 40.7200,
    "longitude": -74.0080,
    "address": "123 Main St"
  },
  "deliveryDate": "2023-06-15T10:00:00Z",
  "paymentMethod": "card|layaway|subscription",
  "deliveryType": "standard|express"
}
```
**Response:** `201` Order object

### GET /orders/:id
Get order details (requires auth)
**Response:** `200` Order object

### GET /orders/buyer/orders
Get all buyer's orders (buyer only, requires auth)
**Response:** `200` Array of orders

### GET /orders/supplier/orders
Get all supplier's orders (supplier only, requires auth)
**Response:** `200` Array of orders

### PUT /orders/:id/status
Update order status (requires auth)
```json
{
  "status": "confirmed|in_transit|delivered|cancelled"
}
```
**Response:** `200` Updated order

### PUT /orders/:id/assign-delivery
Assign delivery team (supplier only, requires auth)
```json
{
  "deliveryTeamId": 5
}
```
**Response:** `200` Updated order

---

## 💳 Payment Endpoints

### POST /payments/order/:orderId
Create payment for order (buyer only, requires auth)
**Response:** `200`
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### POST /payments/subscription
Subscribe to plan (supplier only, requires auth)
```json
{
  "planType": "starter|professional"
}
```
**Response:** `200`
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### POST /payments/webhook
Stripe webhook (public)
**Response:** `200` Webhook processed

---

## ✅ Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (no permission) |
| 404 | Not found |
| 500 | Server error |

---

## 🔄 Common Response Patterns

### Success
```json
{
  "message": "Operation successful",
  "data": { /* object */ }
}
```

### Error
```json
{
  "error": "Error description",
  "message": "Detailed message"
}
```

### Validation Error
```json
{
  "errors": [
    {
      "param": "email",
      "msg": "Invalid email format"
    }
  ]
}
```

---

## 🔑 Authentication

1. **Register** → Get JWT token
2. **Login** → Get JWT token
3. **Include token** in Authorization header: `Bearer <token>`
4. **Token expires** after 7 days (default)
5. **Refresh token** endpoint to get new token

---

## 🎯 Role-Based Access

| Endpoint | Buyer | Supplier | Delivery |
|----------|-------|----------|----------|
| POST /products | ❌ | ✅ | ❌ |
| POST /orders | ✅ | ❌ | ❌ |
| GET /orders/buyer/orders | ✅ | ❌ | ❌ |
| GET /orders/supplier/orders | ❌ | ✅ | ❌ |
| PUT /orders/:id/assign-delivery | ❌ | ✅ | ❌ |

---

## 📍 Wood Types

```
Oak, Maple, Pine, Cherry, Walnut, Birch, Ash, Cedar
```

---

## 📦 Units

```
cord, board_foot, ton
```

---

## 💡 Tips

- Always include Authorization header for protected endpoints
- Use `nearby` endpoint to get products by location
- Check `price/average` to see market rates
- Create order with `card`, `layaway`, or `subscription`
- Supplier commission depends on subscription plan

---

## 🧪 Test Flow

1. Register as Buyer
2. Register as Supplier
3. Supplier creates product
4. Buyer searches nearby products
5. Buyer creates order
6. Supplier views order
7. Process payment via Stripe
8. Delivery team assigned

---

**For detailed info, see docs/API.md**
