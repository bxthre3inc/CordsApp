# Quick Start Guide

## One-Minute Overview

**Cords** is a wood marketplace connecting buyers, suppliers, and delivery teams. Start by running both the backend API and React frontend.

## 5-Minute Setup

### 1. Backend (Terminal 1)
```bash
cd backend
npm install
cp .env.example .env
npm run migrate    # Setup database
npm run dev        # Start server on :5000
```

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
cp .env.example .env.local
npm start          # Start on :3000
```

### 3. Access Application
- Frontend: http://localhost:3000
- API: http://localhost:5000/api
- Docs: http://localhost:3000/api/docs

## Default Test Accounts

After running migrations, use these to test:

**Buyer:**
- Email: buyer@example.com
- Password: password123
- Role: buyer

**Supplier:**
- Email: supplier@example.com
- Password: password123
- Role: supplier

## Key Features to Test

### As a Buyer
1. Register/Login with buyer role
2. Search for wood by type and location
3. View average prices in your area
4. View supplier details
5. Request quotes or place orders

### As a Supplier
1. Register/Login with supplier role
2. Add wood products
3. Set pricing and quantities
4. View incoming orders
5. Assign delivery teams

## Important API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/products/nearby` | Find wood nearby |
| GET | `/api/products/price/average` | Check average price |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/products` | Add product (supplier) |

## Troubleshooting

**Database Error?**
```bash
# Check PostgreSQL is running
psql cords_db

# Or recreate database
dropdb cords_db
createdb cords_db
npm run migrate
```

**Port already in use?**
```bash
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

**Dependencies issue?**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Customize environment variables in `.env` files
2. Configure Stripe keys for payments
3. Add Mapbox token for geolocation
4. Review API documentation: `docs/API.md`
5. Check deployment guide: `docs/DEPLOYMENT.md`

## Documentation

- [Full README](README.md) - Complete project documentation
- [API Docs](docs/API.md) - All endpoints with examples
- [Development Guide](docs/DEVELOPMENT.md) - Setup and best practices
- [Deployment Guide](docs/DEPLOYMENT.md) - Production setup
- [Roadmap](docs/ROADMAP.md) - Future features and milestones

## Key Files to Know

```
backend/
  src/index.js          - Server entry point
  src/models/           - Database models
  src/controllers/      - Route handlers
  src/routes/           - API endpoints

frontend/
  src/App.js           - Main app component
  src/pages/           - Dashboard pages
  src/context/         - Auth context
  src/services/api.js  - API client

database/
  schema.sql          - Database structure
```

---

**Ready to code?** Start with the backend and frontend servers, then navigate to http://localhost:3000 and register as a buyer or supplier!
