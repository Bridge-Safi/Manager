FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g pnpm@9 && \
    pnpm install --no-frozen-lockfile && \
    pnpm run typecheck:libs && \
    BASE_PATH=/ pnpm --filter @workspace/delivery-manager run build && \
    pnpm --filter @workspace/api-server run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "artifacts/api-server/dist/index.mjs"]
