# Stage 1: Chef base (cargo-chef preinstalled)
FROM lukemathwalker/cargo-chef:latest-rust-1-alpine AS chef
RUN apk add --no-cache musl-dev perl
WORKDIR /app

# Stage 2: Plan — compute dependency recipe (only changes when manifests change)
FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Build — cook dependencies first (cached layer), then build our crates
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json -p exameow-server
COPY Cargo.toml Cargo.lock ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
RUN cargo build --release -p exameow-server

# Stage 4: Runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/exameow-server /app/server
COPY frontend/dist /app/static
WORKDIR /app

RUN mkdir -p /app/.config /app/data
ENV HOME=/app
ENV STATIC_DIR=/app/static
ENV PORT=3000
ENV RUST_LOG=info

EXPOSE 3000
CMD ["./server"]
