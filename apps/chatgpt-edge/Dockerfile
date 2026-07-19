FROM node:22.23.1-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3

ARG SOURCE_COMMIT=unknown
LABEL org.opencontainers.image.source="https://github.com/JENN2046/codex-memory" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}" \
      org.opencontainers.image.title="codex-memory ChatGPT R4 Edge"

ENV NODE_ENV=production \
    CODEX_MEMORY_R4_EDGE_BIND_HOST=0.0.0.0 \
    CODEX_MEMORY_R4_EDGE_PORT=8080 \
    CODEX_MEMORY_R4_CONTAINER_LOOPBACK_PUBLISH_REQUIRED=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force \
    && printf '%s\n' "${SOURCE_COMMIT}" > /app/.build-source-commit \
    && chmod 0444 /app/package.json /app/package-lock.json /app/.build-source-commit

COPY packages/chatgpt-r4-contracts ./packages/chatgpt-r4-contracts
COPY apps/chatgpt-memory-scope-widget ./apps/chatgpt-memory-scope-widget
COPY apps/chatgpt-edge ./apps/chatgpt-edge

RUN install -d -o node -g node -m 0700 /run/secrets/codex-memory-r4

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const h=require('node:http');const u=new URL(process.env.CODEX_MEMORY_R4_PUBLIC_ORIGIN);const r=h.request({host:'127.0.0.1',port:process.env.CODEX_MEMORY_R4_EDGE_PORT,path:'/healthz',headers:{host:u.host,'x-forwarded-proto':'https'}},x=>process.exit(x.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.end()"

ENTRYPOINT ["node", "apps/chatgpt-edge/external-main.js"]
