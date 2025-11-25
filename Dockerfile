# syntax=docker/dockerfile:1

# ---- Build stage ----
# Vite 7 与 @vitejs/plugin-vue 6 要求 Node >= 20.19 或 >= 22.12
# 使用 Node 22 来满足引擎要求，避免 EBADENGINE 警告/错误
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install

COPY . .
# 通过 Docker Build Args 注入 VITE_BASE_API，Vite 在构建时读取
ARG VITE_BASE_API
ENV VITE_BASE_API=${VITE_BASE_API}
RUN npm run build

# ---- Runtime stage (Nginx) ----
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 安装 envsubst 以在容器启动时替换 PORT
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 默认端口（Render 会注入 PORT 变量覆盖）
ENV PORT=80
EXPOSE 80

CMD sh -c "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
