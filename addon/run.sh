#!/usr/bin/with-contenv bashio

echo "[Info] Starting HAUI Dashboard..."

# 可以在此处读取 options 并修改 index.html 中的默认配置
# 例如虽然可以通过环境变量注入 API 地址

echo "[Info] Starting Nginx..."
exec nginx -g "daemon off;"
