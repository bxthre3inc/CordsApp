#!/bin/sh

# Replace API URL in nginx config
sed -i "s|__API_URL__|${REACT_APP_API_URL}|g" /etc/nginx/nginx.conf

# Start nginx
exec "$@"
