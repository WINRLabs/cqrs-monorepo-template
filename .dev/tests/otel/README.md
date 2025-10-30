# OTEL Test HTTP Server

Basit bir HTTP test server'ı. OpenTelemetry trace'leri gönderir.

## Endpoints

- `GET /health` - Health check
- `GET /test` - Normal test endpoint (50ms)
- `GET /slow` - Yavaş endpoint (500ms)

## Çalıştırma

```bash
# Local
export OTEL_EXPORTER_OTLP_ENDPOINT="localhost:4317"
go run main.go

# Docker
docker build -t otel-test .
docker run -p 8080:8080 -e OTEL_EXPORTER_OTLP_ENDPOINT="host.docker.internal:4317" otel-test
```

## Test

```bash
curl http://localhost:8080/health
curl http://localhost:8080/test
curl http://localhost:8080/slow
```
