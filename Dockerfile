# Stage 1: Build
FROM rust:1-alpine AS builder
RUN apk add --no-cache musl-dev perl
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN sed -i '/src-tauri/d' Cargo.toml

RUN cargo build --release -p exambot-server

# Stage 2: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/exambot-server /app/server
COPY frontend/dist /app/static
WORKDIR /app

RUN mkdir -p /app/.config
ENV HOME=/app
ENV STATIC_DIR=/app/static
ENV PORT=3000
ENV API_KEY=
ENV RUST_LOG=info

EXPOSE 3000
CMD ["./server"]
