# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "buyer|supplier|delivery",
  "phone": "+1234567890",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}

Response: 201
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "buyer",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "buyer"
  }
}
```

### Products

#### Get Nearby Products
```
GET /products/nearby?latitude=40.7128&longitude=-74.0060&radius=50&woodType=Oak

Query Parameters:
- latitude (required): User latitude
- longitude (required): User longitude
- radius (optional): Search radius in km (default: 50)
- woodType (optional): Filter by wood type

Response: 200
[
  {
    "id": 1,
    "supplier_id": 2,
    "wood_type": "Oak",
    "quantity": 100,
    "unit": "cord",
    "price_per_unit": 50.00,
    "distance": 5.2,
    "supplier_name": "John",
    "supplier_phone": "+1234567890"
  }
]
```

#### Get Average Price
```
GET /products/price/average?woodType=Oak&latitude=40.7128&longitude=-74.0060&radius=50

Response: 200
{
  "wood_type": "Oak",
  "avg_price": 48.50,
  "min_price": 45.00,
  "max_price": 52.00,
  "supplier_count": 3
}
```

#### Create Product (Supplier Only)
```
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "woodType": "Oak",
  "quantity": 100,
  "unit": "cord",
  "pricePerUnit": 50.00,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "description": "Premium grade oak wood"
}

Response: 201
{
  "message": "Product created successfully",
  "product": {
    "id": 1,
    "supplier_id": 2,
    "wood_type": "Oak",
    "quantity": 100,
    "unit": "cord",
    "price_per_unit": 50.00,
    "active": true,
    "created_at": "2023-05-29T10:30:00Z"
  }
}
```

### Orders

#### Create Order (Buyer Only)
```
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": 1,
  "quantity": 10,
  "deliveryLocation": {
    "latitude": 40.7200,
    "longitude": -74.0080,
    "address": "123 Main St, New York, NY"
  },
  "deliveryDate": "2023-06-15T10:00:00Z",
  "paymentMethod": "card|layaway|subscription",
  "deliveryType": "standard|express"
}

Response: 201
{
  "message": "Order created successfully",
  "order": {
    "id": 1,
    "buyer_id": 1,
    "supplier_id": 2,
    "product_id": 1,
    "quantity": 10,
    "total_price": 500.00,
    "status": "pending",
    "payment_method": "card",
    "delivery_type": "standard",
    "created_at": "2023-05-29T10:30:00Z"
  }
}
```

#### Get Buyer Orders
```
GET /orders/buyer/orders
Authorization: Bearer <token>

Response: 200
[
  {
    "id": 1,
    "product_id": 1,
    "wood_type": "Oak",
    "quantity": 10,
    "total_price": 500.00,
    "status": "pending",
    "supplier_name": "John Doe",
    "created_at": "2023-05-29T10:30:00Z"
  }
]
```

#### Get Supplier Orders
```
GET /orders/supplier/orders
Authorization: Bearer <token>

Response: 200
[
  {
    "id": 1,
    "product_id": 1,
    "wood_type": "Oak",
    "quantity": 10,
    "total_price": 500.00,
    "status": "pending",
    "buyer_name": "Jane Smith",
    "buyer_phone": "+1987654321",
    "created_at": "2023-05-29T10:30:00Z"
  }
]
```

#### Update Order Status
```
PUT /orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed|in_transit|delivered|cancelled"
}

Response: 200
{
  "message": "Order status updated",
  "order": {
    "id": 1,
    "status": "confirmed",
    "updated_at": "2023-05-29T11:00:00Z"
  }
}
```

### Payments

#### Create Order Payment
```
POST /payments/order/:orderId
Authorization: Bearer <token>

Response: 200
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

#### Create Subscription
```
POST /payments/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "planType": "starter|professional"
}

Response: 200
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### Users

#### Get Profile
```
GET /users/profile
Authorization: Bearer <token>

Response: 200
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "buyer",
  "phone": "+1234567890",
  "location": {...},
  "created_at": "2023-05-29T10:30:00Z"
}
```

#### Update Profile
```
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "location": {...},
  "bio": "Wood enthusiast"
}

Response: 200
{
  "message": "Profile updated successfully",
  "user": {...}
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "errors": [
    {
      "param": "email",
      "msg": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details (development only)"
}
```

## Rate Limiting

Not yet implemented. Add rate limiting middleware for production.

## Pagination

Not yet implemented. Add pagination to product and order lists.

## Filtering & Sorting

To be implemented based on requirements.
