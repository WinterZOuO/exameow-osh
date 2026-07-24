# Stage 1: Build
FROM rust:1-alpine AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
RUN apk add --no-cache musl-dev perl
RUN mkdir -p /root/.cargo
RUN <<CARGO_CONFIG cat > /root/.cargo/config.toml
[registries.crates-io]
protocol = "sparse"

[source.crates-io]
replace-with = "tuna"

[source.tuna]
registry = "sparse+https://mirrors.tuna.tsinghua.edu.cn/crates.io-index/"
CARGO_CONFIG
ENV CARGO_HOME=/root/.cargo
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN sed -i '/src-tauri/d; /plugins\/screenrecord/d' Cargo.toml

RUN cargo build --release -p exameow-server

# Stage 2: Runtime
FROM alpine:3.21
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/target/release/exameow-server /app/server
COPY frontend/dist /app/static
WORKDIR /app

RUN mkdir -p /app/.config
ENV HOME=/app
ENV STATIC_DIR=/app/static
ENV PORT=3000
ENV RUST_LOG=info

EXPOSE 3000
CMD ["./server"]
