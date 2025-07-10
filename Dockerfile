# ---- Builder ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . ./
RUN npm run build

# ---- Release ----
FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
RUN npm ci --omit=dev

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

ENV TMPDIR=$(mktemp -d)

EXPOSE 3000
ENTRYPOINT ["node", "build/index.js"]
