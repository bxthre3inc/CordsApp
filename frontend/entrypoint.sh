#!/bin/sh
# Substitute the backend Cloud Run URL into nginx.conf at container start.
# BACKEND_URL is set as a Cloud Run environment variable at deploy time.
if [ -z "$BACKEND_URL" ]; then
  echo "WARNING: BACKEND_URL is not set — API proxy will not work" >&2
fi
sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" /etc/nginx/nginx.conf
exec "$@"
