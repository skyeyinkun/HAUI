#!/bin/sh
set -e

echo "Starting YINKUN_UI..."

# Future: Inject configuration from /data/options.json here
# e.g., jq -r '.some_option' /data/options.json

# Start Nginx
exec nginx -g "daemon off;"
