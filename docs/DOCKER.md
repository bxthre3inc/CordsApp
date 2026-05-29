# Docker configuration for Cords

## Build Images
```bash
# Build backend
docker build -t cords-backend ./backend

# Build frontend
docker build -t cords-frontend ./frontend

# Build database
docker build -t cords-db ./database
```

## Run Containers
```bash
# Database
docker run -d --name cords-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 cords-db

# Backend
docker run -d --name cords-backend -e DB_HOST=cords-db -p 5000:5000 cords-backend

# Frontend
docker run -d --name cords-frontend -p 3000:3000 cords-frontend
```

## Using Docker Compose
```bash
docker-compose up
```

## Docker Files

Create `Dockerfile` for backend:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

EXPOSE 5000

CMD ["npm", "start"]
```

Create `Dockerfile` for frontend:
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `docker-compose.yml`:
```yaml
version: '3'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: cords_db
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
    environment:
      DB_HOST: db
      DB_NAME: cords_db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
```
