FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY frontend/. .

EXPOSE 3000

CMD ["pnpm", "run", "dev", "--", "-H", "0.0.0.0"]
