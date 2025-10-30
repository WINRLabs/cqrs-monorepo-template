#!/bin/bash
set -e

echo "Building Docker image..."
docker build -t otel-test:latest .

echo "Loading image to kind cluster..."
kind load docker-image otel-test:latest --name rise

echo "Deploying to Kubernetes..."
kubectl apply -f deployment.yaml

echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=60s deployment/otel-test

echo "Deployment complete!"
echo ""
echo "Get service info:"
echo "  kubectl get svc otel-test"
echo ""
echo "Test endpoints:"
echo "  kubectl port-forward svc/otel-test 8080:80"
echo "  curl http://localhost:8080/health"
echo "  curl http://localhost:8080/test"
echo "  curl http://localhost:8080/slow"

