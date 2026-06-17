#!/usr/bin/env bash
set -e

echo "==> Building Docker images (must run in the project root)..."
docker build -t ecommerce-platform-web:latest ./web-service
docker build -t ecommerce-platform-payment-service:latest ./payment-service
docker build -t ecommerce-platform-search-service:latest ./search-service

# If using minikube, load images into its Docker daemon:
if command -v minikube &> /dev/null; then
  echo "==> Loading images into minikube..."
  minikube image load ecommerce-platform-web:latest
  minikube image load ecommerce-platform-payment-service:latest
  minikube image load ecommerce-platform-search-service:latest
fi

echo "==> Applying Kubernetes manifests..."
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml
kubectl apply -f k8s/10-mongo.yaml
kubectl apply -f k8s/11-elasticsearch.yaml
kubectl apply -f k8s/20-web.yaml
kubectl apply -f k8s/21-payment-service.yaml
kubectl apply -f k8s/22-search-service.yaml
kubectl apply -f k8s/30-nginx-configmap.yaml
kubectl apply -f k8s/31-nginx.yaml

echo "==> Applying monitoring stack (Prometheus + Grafana)..."
kubectl apply -f k8s/39-kube-state-metrics.yaml
kubectl apply -f k8s/40-prometheus-configmap.yaml
kubectl apply -f k8s/41-prometheus-rbac.yaml
kubectl apply -f k8s/42-prometheus.yaml
kubectl apply -f k8s/43-grafana-datasources.yaml
kubectl apply -f k8s/44-grafana-dashboard-provider.yaml
kubectl apply -f k8s/45-grafana-dashboard-ecommerce.yaml
kubectl apply -f k8s/46-grafana.yaml

echo "==> Waiting for pods to become ready..."
kubectl -n ecommerce rollout status deployment/web --timeout=180s
kubectl -n ecommerce rollout status deployment/payment-service --timeout=180s
kubectl -n ecommerce rollout status deployment/search-service --timeout=180s
kubectl -n ecommerce rollout status deployment/nginx --timeout=180s
kubectl -n ecommerce rollout status deployment/prometheus --timeout=180s
kubectl -n ecommerce rollout status deployment/grafana --timeout=180s

echo "==> Done. Check status with: kubectl -n ecommerce get pods,svc,hpa"
