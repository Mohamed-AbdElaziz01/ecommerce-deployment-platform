# Monitoring: Prometheus + Grafana

Adds cluster-internal monitoring for the e-commerce platform.

## Components

| File                                  | Resource                                       |
|-----------------------------------------|--------------------------------------------------|
| `39-kube-state-metrics.yaml`             | Exposes Kubernetes object state (replica counts, HPA status) |
| `40-prometheus-configmap.yaml`            | Prometheus scrape config (pod + cAdvisor discovery) |
| `41-prometheus-rbac.yaml`                  | ServiceAccount/ClusterRole so Prometheus can discover pods/nodes |
| `42-prometheus.yaml`                        | Prometheus Deployment + Service + PVC (15d retention) |
| `43-grafana-datasources.yaml`                | Auto-provisions Prometheus as a Grafana datasource |
| `44-grafana-dashboard-provider.yaml`          | Tells Grafana where to load dashboards from |
| `45-grafana-dashboard-ecommerce.yaml`          | Pre-built "E-Commerce Platform Overview" dashboard |
| `46-grafana.yaml`                                | Grafana Deployment + Service (LoadBalancer) + PVC |

## What gets monitored

Each application service (`web`, `payment-service`, `search-service`) now exposes
a `/metrics` endpoint (via `prom-client`) with:

- `*_http_requests_total` - request counter by method/route/status
- `*_http_request_duration_seconds` - latency histogram
- Default Node.js process metrics (CPU, memory, event loop lag, GC)
- `payment_service_payments_total` - business metric: payment outcomes
  (`succeeded` / `declined` / `gateway_error`)

Pods are annotated with `prometheus.io/scrape: "true"` so Prometheus auto-discovers
them via the Kubernetes API - no manual target configuration needed.

`kube-state-metrics` exposes Kubernetes-level metrics like
`kube_deployment_status_replicas`, useful for visualizing HPA scaling activity.

cAdvisor (built into kubelet) provides per-pod CPU and memory usage
(`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`).

## Deploy

Already included in `deploy.sh`. To apply manually:

```bash
kubectl apply -f k8s/39-kube-state-metrics.yaml
kubectl apply -f k8s/40-prometheus-configmap.yaml
kubectl apply -f k8s/41-prometheus-rbac.yaml
kubectl apply -f k8s/42-prometheus.yaml
kubectl apply -f k8s/43-grafana-datasources.yaml
kubectl apply -f k8s/44-grafana-dashboard-provider.yaml
kubectl apply -f k8s/45-grafana-dashboard-ecommerce.yaml
kubectl apply -f k8s/46-grafana.yaml
```

> Rebuild and reload the `web`, `payment-service`, and `search-service` images first
> so the new `/metrics` endpoints are present:
> ```bash
> docker build -t ecommerce-platform-web:latest ./web-service
> docker build -t ecommerce-platform-payment-service:latest ./payment-service
> docker build -t ecommerce-platform-search-service:latest ./search-service
> kubectl -n ecommerce rollout restart deployment web payment-service search-service
> ```

## Access

### Prometheus
```bash
kubectl -n ecommerce port-forward svc/prometheus 9090:9090
```
Open `http://localhost:9090`. Check **Status > Targets** to confirm all
`ecommerce-services` pods show as `UP`.

### Grafana
```bash
kubectl -n ecommerce port-forward svc/grafana 3000:3000
```
Open `http://localhost:3000` and log in with:
- **Username**: `admin`
- **Password**: `admin`

Go to **Dashboards > E-Commerce Platform > E-Commerce Platform Overview**. It includes:

- HTTP request rate per service
- P95 latency for web-service routes
- Payment outcomes (succeeded / declined / gateway error)
- Per-pod CPU and memory usage
- HTTP 5xx error rate
- Replica count per deployment (useful for watching HPA scale events)

> ⚠️ Change the default Grafana password before using this outside a local dev cluster.

## Generating data for the dashboards

Use the same load-generator approach as the HPA test:
```bash
kubectl -n ecommerce run load-generator --image=busybox:1.36 --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://web:3000/api/products > /dev/null; done"
```
Watch the dashboard update in near real-time (15s scrape interval).

## Cleanup

```bash
kubectl delete -f k8s/46-grafana.yaml
kubectl delete -f k8s/45-grafana-dashboard-ecommerce.yaml
kubectl delete -f k8s/44-grafana-dashboard-provider.yaml
kubectl delete -f k8s/43-grafana-datasources.yaml
kubectl delete -f k8s/42-prometheus.yaml
kubectl delete -f k8s/41-prometheus-rbac.yaml
kubectl delete -f k8s/40-prometheus-configmap.yaml
kubectl delete -f k8s/39-kube-state-metrics.yaml
```
