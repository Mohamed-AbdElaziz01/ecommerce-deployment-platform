# E-Commerce Web Service

Core web/API microservice for the **Automated E-Commerce Deployment Platform** project.
Built with Node.js + Express + MongoDB, containerized with Docker, and ready to plug into
Kubernetes, CI/CD, and the rest of the platform's services (payment, search, monitoring).

## Features

- **Products**: CRUD, pagination, search, category/price filters, stock management
- **Auth**: JWT-based register/login, role-based access (customer/admin)
- **Orders**: order creation with stock validation and a call out to the `payment-service`
- **Health checks**: `/health/live` and `/health/ready` endpoints for Kubernetes probes
- **Security**: Helmet, CORS, non-root Docker user
- **Logging**: morgan request logging (ready to ship to ELK/Prometheus stack)

## Project Structure

```
web-service/
├── src/
│   ├── config/
│   │   └── db.js          # MongoDB connection
│   ├── middleware/
│   │   └── auth.js         # JWT auth + admin guard
│   ├── models/
│   │   ├── Product.js
│   │   ├── User.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── health.js
│   │   ├── products.js
│   │   ├── auth.js
│   │   └── orders.js
│   ├── seed.js             # Sample data seeder
│   └── index.js            # App entry point
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## Running Locally (with Docker)

```bash
cp .env.example .env
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

Seed sample products:

```bash
docker-compose exec web npm run seed
```

## Running Locally (without Docker)

```bash
npm install
cp .env.example .env
# Make sure MongoDB is running locally and MONGO_URI points to it
npm run dev
```

## API Endpoints

### Health
| Method | Endpoint        | Description              |
|--------|-----------------|---------------------------|
| GET    | `/health/live`  | Liveness probe            |
| GET    | `/health/ready` | Readiness probe (DB check)|

### Auth
| Method | Endpoint             | Description       |
|--------|----------------------|--------------------|
| POST   | `/api/auth/register` | Register new user  |
| POST   | `/api/auth/login`    | Login, returns JWT |

### Products
| Method | Endpoint                  | Description                    |
|--------|---------------------------|---------------------------------|
| GET    | `/api/products`           | List products (filters, search) |
| GET    | `/api/products/:id`       | Get single product               |
| POST   | `/api/products`           | Create product                   |
| PUT    | `/api/products/:id`       | Update product                   |
| DELETE | `/api/products/:id`       | Deactivate product                |
| PATCH  | `/api/products/:id/stock` | Adjust stock                     |

### Orders (require `Authorization: Bearer <token>`)
| Method | Endpoint                | Description                           |
|--------|--------------------------|----------------------------------------|
| GET    | `/api/orders`            | List own orders (admin: all orders)    |
| GET    | `/api/orders/:id`        | Get single order                       |
| POST   | `/api/orders`            | Create order (validates stock, charges via payment-service) |
| PATCH  | `/api/orders/:id/status` | Update order status (admin only)       |

## Environment Variables

| Variable             | Description                         | Default                          |
|----------------------|--------------------------------------|-----------------------------------|
| `PORT`               | Server port                         | `3000`                             |
| `MONGO_URI`          | MongoDB connection string           | `mongodb://mongo:27017/ecommerce` |
| `JWT_SECRET`         | Secret for signing JWTs             | *(required in production)*        |
| `PAYMENT_SERVICE_URL`| Base URL of payment microservice    | `http://payment-service:4000`     |

## Next Steps (per project roadmap)

- [ ] Build `payment-service` and `search-service` (Elasticsearch)
- [ ] Add Nginx reverse proxy in front of this service
- [ ] Write Kubernetes manifests (Deployment, Service, HPA) using `/health/live` & `/health/ready`
- [ ] Add CI/CD pipeline (Jenkins) to build/push the Docker image
- [ ] Add Prometheus metrics endpoint (`/metrics`)
- [ ] Terraform provisioning for AWS infra (EC2/RDS/S3/ELB)
