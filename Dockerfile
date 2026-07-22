FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NITRO_PRESET=node-server
ENV VITE_SUPABASE_URL="https://pqbejvhuavzjekznouar.supabase.co"
ENV VITE_SUPABASE_PROJECT_ID="pqbejvhuavzjekznouar"
ENV VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxYmVqdmh1YXZ6amVrem5vdWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODY1NDMsImV4cCI6MjEwMDI2MjU0M30.VyulYtfVCpldH4OV8uDebVQumHcLmPJzFUENUpMzDoE"
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
