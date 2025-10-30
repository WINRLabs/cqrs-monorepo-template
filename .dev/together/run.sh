kind create cluster --config=cluster/cluster.yaml

helm repo add jetstack https://charts.jetstack.io
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts

helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.19.1 \
  --set crds.enabled=true \
  --set prometheus.enabled=false \
  --set prometheus.podmonitor.enabled=false

helm install kube-prometheus-stack oci://ghcr.io/prometheus-community/charts/kube-prometheus-stack

helm install my-opentelemetry-operator open-telemetry/opentelemetry-operator \
  --set "manager.collectorImage.repository=otel/opentelemetry-collector-k8s" \
  --set admissionWebhooks.certManager.enabled=false \
  --set admissionWebhooks.autoGenerateCert.enabled=true



# helm install rabbitmq-cluster oci://registry-1.docker.io/bitnamicharts
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"

kubectl apply -f rabbitmq/cluster.yaml

kubectl apply -f otel/collector.yaml

# Build and deploy otel-test server
cd ../otel-test
docker build -t otel-test:latest .
kind load docker-image otel-test:latest --name rise
kubectl apply -f deployment.yaml
cd ../together