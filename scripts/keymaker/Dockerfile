FROM golang:1.23-alpine AS builder

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o keymaker main.go

FROM gcr.io/distroless/static-debian12

WORKDIR /app

COPY --from=builder /build/keymaker .
COPY config.yaml .

ENTRYPOINT ["./keymaker"]

