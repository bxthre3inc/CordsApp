# Development Setup & Contributing Guide

## Development Environment

### Required Tools
- Node.js v16+
- npm or yarn
- PostgreSQL 13+
- Git
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - REST Client
  - Thunder Client or Postman

### Initial Setup

1. **Clone repository:**
```bash
git clone <repository-url>
cd CordsApp
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
cp .env.example .env
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
cp .env.example .env.local
```

4. **Setup database:**
```bash
# Create PostgreSQL database
createdb cords_dev_db

# Run migrations
cd backend
npm run migrate
```

## Running the Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Runs on `http://localhost:5000`

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```
Runs on `http://localhost:3000`

### Terminal 3 - PostgreSQL (if needed)
```bash
psql cords_dev_db
```

## Database Management

### Creating Tables
```bash
cd backend
npm run migrate
```

### Seeding Sample Data
```sql
-- Connect to database
psql cords_dev_db

-- Insert sample users
INSERT INTO users (email, password, first_name, last_name, role, phone, created_at)
VALUES 
  ('buyer@example.com', 'hashed_password', 'Jane', 'Buyer', 'buyer', '+1234567890', NOW()),
  ('supplier@example.com', 'hashed_password', 'John', 'Supplier', 'supplier', '+0987654321', NOW());

-- Insert sample products
INSERT INTO products (supplier_id, wood_type, quantity, unit, price_per_unit, location, description, created_at)
VALUES 
  (2, 'Oak', 100, 'cord', 50.00, '{"latitude": 40.7128, "longitude": -74.0060}', 'Premium Oak', NOW());
```

### Reset Database
```bash
# Drop and recreate
dropdb cords_dev_db
createdb cords_dev_db
npm run migrate
```

## Code Structure

### Backend

**models/** - Database models
```javascript
// Example: User.js
static async findByEmail(email) {
  // Query implementation
}
```

**controllers/** - Request handlers
```javascript
// Example: AuthController.js
static async login(req, res) {
  // Business logic
}
```

**routes/** - API endpoints
```javascript
// Example: auth.js
router.post('/login', AuthController.login);
```

**middleware/** - Express middleware
```javascript
// Example: auth.js
const authenticate = (req, res, next) => {
  // Auth logic
}
```

### Frontend

**pages/** - Full-page components
**components/** - Reusable components
**services/** - API integration
**context/** - React Context for state management
**hooks/** - Custom React hooks

## Coding Standards

### JavaScript Style Guide

1. **Use ES6+ features:**
```javascript
// ✅ Good
const users = data.map(item => item.user);
const { email, password } = user;

// ❌ Avoid
var users = data.map(function(item) { return item.user; });
var email = user.email;
```

2. **Naming conventions:**
```javascript
// Constants
const MAX_RETRIES = 3;

// Functions
const getUserById = (id) => {};

// Classes
class UserController {}

// Variables
let currentUser = null;
```

3. **Error handling:**
```javascript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ error: 'Operation failed' });
}
```

### React Best Practices

1. **Component structure:**
```javascript
const MyComponent = () => {
  // Hooks at top
  const [state, setState] = useState(null);
  const { user } = useAuth();

  // Effects
  useEffect(() => {
    loadData();
  }, []);

  // Event handlers
  const handleClick = () => {};

  // JSX
  return <div>Content</div>;
};
```

2. **Props validation:**
```javascript
import PropTypes from 'prop-types';

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func
};
```

## Testing

### Backend Unit Tests
```bash
cd backend
npm test
```

### Frontend Component Tests
```bash
cd frontend
npm test
```

### API Testing with REST Client

Create `.vscode/extensions.rest-client/test.http`:
```http
### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

### Get Products
GET http://localhost:5000/api/products/nearby?latitude=40.7128&longitude=-74.0060
```

## Git Workflow

1. **Create feature branch:**
```bash
git checkout -b feature/user-authentication
```

2. **Make changes and commit:**
```bash
git add .
git commit -m "feat: implement user authentication"
```

3. **Push branch:**
```bash
git push origin feature/user-authentication
```

4. **Create Pull Request:**
- Use descriptive title
- Link to related issues
- Add description of changes

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(auth): implement JWT token refresh

- Add refresh token endpoint
- Store refresh tokens in database
- Update auth middleware

Fixes #123
```

## Debugging

### Backend Debugging

Using VS Code debugger:
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/src/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### Frontend Debugging
- Use React Developer Tools extension
- Use Redux DevTools if using Redux
- Chrome DevTools for network and performance

### Logging
```javascript
// Backend
console.log('Debug:', data);
console.error('Error:', error);

// Frontend
console.log('Component mounted');
```

## Common Issues

### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Error
```bash
# Check PostgreSQL service
sudo service postgresql status
sudo service postgresql start

# Verify credentials in .env
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Performance Tips

1. **Database queries:**
   - Use indexes on frequently queried columns
   - Avoid N+1 queries with JOINs
   - Use EXPLAIN to analyze queries

2. **Frontend:**
   - Lazy load components with React.lazy()
   - Memoize expensive computations
   - Use virtualization for long lists

3. **API:**
   - Cache responses when appropriate
   - Compress responses with gzip
   - Implement pagination

## Adding New Features

### Example: Add New Wood Type

1. **Backend:**
   - No changes needed (dynamic in frontend)

2. **Frontend:**
   ```javascript
   // BuyerDashboard.js
   const woodTypes = [
     'Oak',
     'Maple',
     'Pine',
     'Cherry',
     'Walnut',
     'Birch',
     'Ash',
     'Cedar',
     'Hickory'  // Add new type
   ];
   ```

3. **Test:**
   - Verify in buyer dashboard
   - Verify in supplier dashboard
   - Test API filtering

## Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Stripe API Reference](https://stripe.com/docs/api)

---

Happy coding! 🚀
