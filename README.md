# Automated E-Commerce Deployment Platform

A multi-service e-commerce platform with web/API, mock payments, Elasticsearch-backed
search, and an Nginx reverse proxy — all containerized and orchestrated with Docker
Compose.

## Architecture

```
                        ┌─────────────┐
        client ───────▶ │    Nginx     │  (port 8080)
                        │ reverse proxy│
                        └──────┬───────┘
                               │
        ┌──────────────────────┼────────────────────────┐
        ▼                      ▼                         ▼
 ┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
 │ web-service │      │ payment-service   │      │ search-service    │
 │ (port 3000) │─────▶│ (port 4000)       │      │ (port 5000)        │
 │ products,   │      │ mock charge/refund│      │ Elasticsearch search│
 │ auth, orders│      └─────────┬─────────┘      └─────────┬──────────┘
 └──────┬──────┘                │                          │
        │                       ▼                          ▼
        │                ┌─────────────┐          ┌──────────────────┐
        └───────────────▶│   MongoDB   │          │  Elasticsearch    │
                         │ (port 27017)│          │  (port 9200)      │
                         └─────────────┘          └──────────────────┘
```

- **web-service**: products, auth (JWT), orders. Calls `payment-service` to charge
  orders and syncs product changes to `search-service`.
- **payment-service**: mock payment gateway. Cards ending `0000` are declined,
  `1111` simulate a gateway error, everything else succeeds.
- **search-service**: Elasticsearch-backed full-text product search and autocomplete.
- **nginx**: single entry point (port `8080`) routing `/api/*` to the right service.

## Running the Platform

```bash
docker-compose up --build
```

First boot takes a minute or two (Elasticsearch needs time to become healthy).

### Seed sample data

```bash
docker-compose exec web npm run seed
```

### Sync products into the search index

```bash
docker-compose exec search-service npm run reindex
```

## Access Points

| Service           | Direct URL              | Via Nginx (recommended)        |
|-------------------|--------------------------|----------------------------------|
| Web/API           | http://localhost:3000    | http://localhost:8080/api/...    |
| Payment service   | http://localhost:4000    | http://localhost:8080/api/payments |
| Search service    | http://localhost:5000    | http://localhost:8080/api/search |
| Elasticsearch     | http://localhost:9200    | -                                  |
| MongoDB           | localhost:27017          | -                                  |

## Example Requests

### Search products
```bash
curl "http://localhost:8080/api/search/products?q=watch"
```

### Register and login
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"secret123"}'

curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```

### Place an order (use the JWT from login)
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
        "items": [{"productId": "<PRODUCT_ID>", "quantity": 1}],
        "shippingAddress": {"city": "Cairo", "country": "Egypt"},
        "paymentMethod": {"cardNumber": "4242424242424242"}
      }'
```

A card ending in `0000` will be declined (test the failure path):
```json
"paymentMethod": {"cardNumber": "4000000000000000"}
```

## Stopping

```bash
docker-compose down
```

To wipe all data (MongoDB + Elasticsearch volumes):
```bash
docker-compose down -v
```

## Service Folders

```
ecommerce-platform/
├── docker-compose.yml
├── web-service/        # Node/Express API: products, auth, orders
├── payment-service/     # Node/Express mock payment gateway
├── search-service/       # Node/Express + Elasticsearch search
└── nginx/                  # Reverse proxy config
```

## Next Steps (per project roadmap)

- [x] Kubernetes manifests (Deployment, Service, HPA) for each service - see `k8s/`
- [x] Jenkins CI/CD pipelines - see `Jenkinsfile` and `jenkins/`
- [x] Prometheus + Grafana monitoring - see `k8s/MONITORING.md`
- [x] Ansible provisioning scripts - see `ansible/`
- [x] Terraform for AWS (EC2/RDS/S3/ELB) - see `terraform/`
