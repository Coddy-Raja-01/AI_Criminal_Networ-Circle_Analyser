#!/bin/sh
set -eu

test -n "${API_KEY:-}" || {
  echo "API_KEY must be configured for the frontend proxy" >&2
  exit 1
}

test -n "${BACKEND_URL:-}" || {
  echo "BACKEND_URL must be configured for the frontend proxy" >&2
  exit 1
}

test -n "${PORT:-}" || {
  echo "PORT must be configured for the frontend web server" >&2
  exit 1
}

envsubst '${API_KEY} ${BACKEND_URL} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf