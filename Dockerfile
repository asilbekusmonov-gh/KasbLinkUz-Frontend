FROM oven/bun:1

WORKDIR /app

COPY . .

RUN bun install

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN bun run build
EXPOSE 3000

CMD ["bun", "run", "start"]