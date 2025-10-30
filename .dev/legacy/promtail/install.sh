helm repo add grafana https://grafana.github.io/helm-charts

helm repo update

helm upgrade --values values.yaml --install promtail grafana/promtail --namespace=monitoring --create-namespace