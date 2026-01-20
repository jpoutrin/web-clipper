# Production Dockerfile for Synology NAS deployment
# Supports both amd64 (Intel/AMD Synology) and arm64 (ARM Synology)
#
# Build: docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/web-clipper:latest --push .
# Or single arch: docker build -t web-clipper:latest .

FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder

ARG TARGETPLATFORM
ARG BUILDPLATFORM
ARG TARGETOS
ARG TARGETARCH

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    sqlite-dev \
    git

WORKDIR /src

# Copy go mod files first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build with CGO for SQLite support
# CGO_CFLAGS needed for musl compatibility with go-sqlite3
ENV CGO_ENABLED=1
ENV CGO_CFLAGS="-D_LARGEFILE64_SOURCE"
ENV GOOS=${TARGETOS}
ENV GOARCH=${TARGETARCH}

RUN go build -tags sqlite -ldflags="-s -w" -o /bin/web-clipper ./cmd/app

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache \
    ca-certificates \
    sqlite \
    tzdata \
    busybox-extras

# Create non-root user
RUN addgroup -g 1000 clipper && \
    adduser -u 1000 -G clipper -s /bin/sh -D clipper

# Create directories
RUN mkdir -p /app/data /app/clips /app/config /app/migrations && \
    chown -R clipper:clipper /app

WORKDIR /app

# Copy binary from builder
COPY --from=builder /bin/web-clipper /app/web-clipper

# Copy migrations
COPY --chown=clipper:clipper migrations/ /app/migrations/

# Copy default config
COPY --chown=clipper:clipper packaging/config/clipper.yaml /app/config/clipper.yaml
COPY --chown=clipper:clipper packaging/config/database.docker.yml /app/config/database.yml

USER clipper

# Environment
ENV GO_ENV=production
ENV ADDR=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Health check (TCP port check)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD nc -z localhost 3000 || exit 1

ENTRYPOINT ["/app/web-clipper"]
