FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY backend/. .
COPY ai-agents /ai-agents

RUN npx prisma generate

EXPOSE 4000

CMD ["pnpm", "run", "start:dev"]
