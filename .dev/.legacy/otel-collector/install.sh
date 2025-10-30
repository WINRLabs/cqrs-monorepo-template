

helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts

helm repo update

helm install opentelemetry-collector open-telemetry/opentelemetry-collector -f values.yaml