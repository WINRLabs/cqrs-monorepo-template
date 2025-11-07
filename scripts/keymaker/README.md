# Keymaker

```bash
# Build
docker build -t keymaker .

# Run
docker run --rm \
  -e RABBITMQ_URL=amqp://user:password@rabbitmq:5672/ \
  -v $(pwd)/config.yaml:/app/config.yaml \
  keymaker
```
