FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Run the development server
CMD ["pnpm", "dev", "--host"]
