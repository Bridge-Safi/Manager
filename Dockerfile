FROM node:22-alpine
WORKDIR /app

# Install pnpm globally (cached layer)
RUN npm install -g pnpm@9

# Copy package manifests only — cached as long as deps don't change
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/delivery-manager/package.json ./artifacts/delivery-manager/
COPY scripts/package.json ./scripts/

# Install dependencies (cached)
RUN pnpm install --no-frozen-lockfile

# Copy all source files — this layer always invalidates when code changes
COPY . .

# Build everything
RUN pnpm run typecheck:libs && \
    BASE_PATH=/ pnpm --filter @workspace/delivery-manager run build && \
    pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
