docker build -f apps/api/Dockerfile . -t api
docker build -f apps/random-worker/Dockerfile . -t random-worker

kind load docker-image api:latest --name rise
kind load docker-image random-worker:latest --name rise