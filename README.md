# Microservies-Orchestration-Platform
A production-grade, containerized API platform with a Node.js backend and PostgreSQL database, deployed on Kubernetes using both raw manifests (Kustomize) and Helm charts — demonstrating end-to-end DevOps and microservices expertise."

# Microservices Orchestration & Kubernetes Deployment

Scalable microservices stack: **Node.js (Express)** API + **PostgreSQL**, orchestrated with **Kubernetes**, **Docker**, **Nginx Ingress**, and **Helm** for high availability and automated failover.

## Architecture

- **Stateless API**: Node.js/Express service run as a Kubernetes **Deployment** (replicas, rolling updates).
- **Stateful DB**: PostgreSQL run as a **StatefulSet** with persistent volume for data.
- **Networking**: Internal **ClusterIP** for service-to-service; **Nginx Ingress** and optional **LoadBalancer** for external traffic.
- **Configuration**: **ConfigMaps** for non-sensitive config; **Secrets** for DB credentials (replace in production with a secret manager).

## Quick Start

### Local (Docker Compose)

```bash
cd microservices-orchestration
export POSTGRES_PASSWORD=secret   # optional
docker compose up -d
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

### Build API image for Kubernetes

```bash
docker build -t api-service:latest ./backend
# For kind/minikube: load into cluster
kind load docker-image api-service:latest   # or minikube image load api-service:latest
```

### Deploy with raw manifests (Kustomize)

```bash
kubectl apply -k k8s/
# Optional: add api.local to /etc/hosts and install Nginx Ingress
kubectl get svc -n microservices
```

### Deploy with Helm

```bash
# Install Nginx Ingress (if not already)
# kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

helm upgrade --install microservices ./helm/microservices -n microservices --create-namespace
# Override DB password (production)
helm upgrade --install microservices ./helm/microservices -n microservices --create-namespace \
  --set secret.postgresPassword="$(openssl rand -base64 24)"
```

### Enable LoadBalancer (e.g. cloud)

In Helm:

```bash
helm upgrade --install microservices ./helm/microservices -n microservices --create-namespace \
  --set loadBalancer.enabled=true
```

With raw manifests, the optional `api-service-lb` Service in `k8s/base/ingress.yaml` is already defined.

## Project Layout

```
microservices-orchestration/
├── backend/                 # Node.js Express API
│   ├── src/index.js
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yaml      # Local dev
├── k8s/
│   ├── kustomization.yaml
│   └── base/
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       ├── postgres-statefulset.yaml
│       ├── api-deployment.yaml
│       └── ingress.yaml
├── helm/
│   └── microservices/       # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
└── README.md
```

## API Endpoints

| Method | Path         | Description        |
|--------|--------------|--------------------|
| GET    | /health      | Service health     |
| GET    | /health/db   | DB connectivity     |
| GET    | /api/items   | List items         |
| POST   | /api/items   | Create item (JSON: `{"name":"..."}`) |

## Production Notes

1. **Secrets**: Do not commit real passwords. Use Helm `--set secret.postgresPassword=...`, Sealed Secrets, or an external secret store (e.g. Vault, cloud provider).
2. **TLS**: Enable and configure `ingress.tls` in Helm or in the Ingress manifest.
3. **Postgres**: For HA, consider increasing StatefulSet replicas and using a Postgres operator (e.g. CloudNative-PG, Zalando).
4. **Images**: Use a registry and set `api.image.repository` and `api.image.tag` in Helm; use `imagePullSecrets` if the registry is private.

## Tech Stack

- **Kubernetes** – orchestration, Deployments, StatefulSet, Services, Ingress
- **Docker** – containerized API and Postgres
- **Node.js / Express** – API service
- **PostgreSQL** – persistent data
- **Nginx Ingress** – external HTTP(S) routing
- **Helm** – templated, parameterized deployment
