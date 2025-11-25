#!/bin/sh
set -e

# 如果未提供 PORT，则默认使用 80（本地/通用场景）
PORT_VALUE="${PORT:-80}"

# 仅替换模板中的 ${PORT}，避免污染 Nginx 的内置变量（如 $uri）
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# 生成前端运行时配置文件，用于在运行时注入后端 BASE_API
# 未设置 BASE_API 时，生成的值为空字符串，前端代码会自动回退到构建时配置或 localhost
if [ -f "/usr/share/nginx/html/runtime-config.js.template" ]; then
  # 同时支持 BASE_API 与 REACT_APP_API_URL 两种命名
  envsubst '${BASE_API} ${REACT_APP_API_URL}' < /usr/share/nginx/html/runtime-config.js.template > /usr/share/nginx/html/runtime-config.js
  echo "Generated runtime-config.js with BASE_API=${BASE_API:-} REACT_APP_API_URL=${REACT_APP_API_URL:-}" >&2
else
  echo "runtime-config.js.template not found; skipping runtime config generation" >&2
fi

echo "Generated /etc/nginx/conf.d/default.conf with PORT=${PORT_VALUE}" >&2

exec nginx -g 'daemon off;'
