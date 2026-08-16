# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
FROM node@sha256:8607a9064d4a571140998ae9e52a3b3fcf9cff361d04642d5971e6cd76d39e27

ARG SOURCE_DATE_EPOCH
ARG BUILD_MANIFEST_DIGEST

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    TZ=UTC \
    SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}

# The controller's Unix peer-credential check has an intentionally tiny
# Python first-party helper. Debian package versions and snapshot date are
# fixed; package installation never occurs at runtime.
RUN printf '%s\n' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260817T000000Z bookworm main' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20260817T000000Z bookworm-security main' \
      > /etc/apt/sources.list \
    && rm -f /etc/apt/sources.list.d/* \
    && apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends \
      python3=3.11.2-1+b1 \
      python3-minimal=3.11.2-1+b1 \
      libpython3-stdlib=3.11.2-1+b1 \
      python3.11=3.11.2-6+deb12u8 \
      python3.11-minimal=3.11.2-6+deb12u8 \
      libpython3.11-minimal=3.11.2-6+deb12u8 \
      libpython3.11-stdlib=3.11.2-6+deb12u8 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/codex-memory
COPY --chown=node:node codex-memory/package.json codex-memory/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force
COPY --chown=node:node codex-memory/ ./

WORKDIR /opt/vcptoolbox
COPY --chown=node:node runtime/vcp-dependencies/package.json \
  runtime/vcp-dependencies/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force
COPY --chown=node:node vcptoolbox/ ./

WORKDIR /opt/codex-memory
COPY --chown=root:root runtime/runtime-build-manifest.json \
  /opt/codex-memory-runtime/runtime-build-manifest.json

LABEL org.opencontainers.image.title="codex-memory-native-runtime" \
      org.opencontainers.image.revision="runtime-build-manifest" \
      io.codex-memory.runtime.build-manifest-digest="${BUILD_MANIFEST_DIGEST}"

USER 1000:1000
ENTRYPOINT ["/usr/local/bin/node", "/opt/codex-memory/scripts/codex-memory-stack.js", "_container-supervisor"]
