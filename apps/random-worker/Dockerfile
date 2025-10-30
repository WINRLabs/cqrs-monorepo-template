ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base

RUN npm install -g pnpm@latest-10 turbo

# RUN yarn set version canary

FROM base AS builder

RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app

COPY . .

RUN turbo prune --scope=@justbet/random-worker --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer

ENV NODE_OPTIONS=--max-old-space-size=16384

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/turbo.json ./turbo.json
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN pnpm install
RUN pnpm turbo run build --filter=@justbet/random-worker...

# RUN
FROM base AS runner

WORKDIR /app

COPY --from=installer /app .

ENV PORT=3000

EXPOSE 3000

CMD [ "node", "apps/random-worker/dist/main.cjs" ]
