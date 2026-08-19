# --- Build ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Vite inline les `VITE_*` dans le bundle AU BUILD (pas au runtime) : passer la vraie URL du
# backend via --build-arg, ex. --build-arg VITE_API_URL=https://api.mon-ecole.mg/api
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Serve ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
