# Kubernetes Manifests

Deploys the full e-commerce platform to a Kubernetes cluster with auto-scaling.

## Components

| File                        | Resource                                  |
|------------------------------|--------------------------------------------|
| `00-namespace.yaml`           | `ecommerce` namespace                      |
| `01-configmap.yaml`           | Shared non-secret configuration            |
| `02-secrets.yaml`              | JWT secret (placeholder - replace it!)     |
| `10-mongo.yaml`                | MongoDB StatefulSet + headless Service     |
| `11-elasticsearch.yaml`         | Elasticsearch StatefulSet + headless Service |
| `20-web.yaml`                   | web-service Deployment + Service + HPA     |
| `21-payment-service.yaml`        | payment-service Deployment + Service + HPA |
| `22-search-service.yaml`          | search-service Deployment + Service + HPA  |
| `30-nginx-configmap.yaml`          | Nginx reverse proxy config                 |
| `31-nginx.yaml`                     | Nginx Deployment + LoadBalancer Service + HPA |

## Prerequisites

- A running Kubernetes cluster (minikube, kind, EKS, GKE, etc.)
- `kubectl` configured to point at your cluster
- Docker (to build images locally)
- **Metrics Server** installed (required for HPA to function):
  ```bash
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
  ```

## 1. Set a real JWT secret (do this first)

Don't deploy with the placeholder secret. Either edit `02-secrets.yaml` with your
own base64 value, or create it directly:

```bash
kubectl create namespace ecommerce
kubectl create secret generic ecommerce-secrets \
  --namespace=ecommerce \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
```

If you create the secret this way, skip applying `02-secrets.yaml`.

## 2. Deploy

From the project root (`ecommerce-platform/`):

```bash
bash k8s/deploy.sh
```

This builds the three application images, loads them into minikube (if detected),
and applies all manifests in order.

### Manual deploy (without the script)

```bash
docker build -t ecommerce-platform-web:latest ./web-service
docker build -t ecommerce-platform-payment-service:latest ./payment-service
docker build -t ecommerce-platform-search-service:latest ./search-service

kubectl apply -f k8s/
```

## 3. Verify

```bash
kubectl -n ecommerce get pods,svc,hpa
```

Wait until all pods show `Running` and `READY 1/1` (Elasticsearch and MongoDB can
take 1-2 minutes to become ready).

## 4. Access the platform

```bash
# minikube
minikube service nginx -n ecommerce

# Or port-forward
kubectl -n ecommerce port-forward svc/nginx 8080:80
```

Then hit `http://localhost:8080/api/products`.

## 5. Seed data & build the search index

```bash
kubectl -n ecommerce exec deploy/web -- npm run seed
kubectl -n ecommerce exec deploy/search-service -- npm run reindex
```

## Auto-scaling

HPAs are configured for `web`, `payment-service`, `search-service`, and `nginx`,
scaling on CPU utilization (and memory for `web`). To watch scaling in action:

```bash
kubectl -n ecommerce get hpa -w
```

To generate load (requires `hey` or `ab`):
```bash
hey -z 60s -c 50 http://localhost:8080/api/products
```

## Notes on Images

`imagePullPolicy: IfNotPresent` is used because images are built locally and tagged
`:latest`. For a real cluster (EKS/GKE/AKS), push images to a registry (ECR, GCR,
Docker Hub) and update the `image:` fields in `20-web.yaml`, `21-payment-service.yaml`,
and `22-search-service.yaml` accordingly — this is exactly what the CI/CD pipeline
(Jenkins) step will automate next.

## Cleanup

```bash
kubectl delete namespace ecommerce
```
