#!/bin/sh
set -e

# 如果未提供 PORT，则默认使用 80（本地/通用场景）
PORT_VALUE="${PORT:-80}"

# 仅替换模板中的 ${PORT}，避免污染 Nginx 的内置变量（如 $uri）
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated /etc/nginx/conf.d/default.conf with PORT=${PORT_VALUE}" >&2

exec nginx -g 'daemon off;'

