helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.19.1 \
  --set crds.enabled=true \
  --set prometheus.enabled=false \
  --set prometheus.podmonitor.enabled=false

