#!/bin/sh
set -eu

PORT="${PORT:-80}"
export PORT

if [ "${METRICS_PROXY:-}" = 1 ]; then
    : "${INGEST_PORT:?INGEST_PORT is required when METRICS_PROXY=1}"
    INGEST_HOST="${INGEST_HOST:-metrics-ingest}"
    export INGEST_PORT INGEST_HOST
    envsubst '$PORT $INGEST_PORT $INGEST_HOST' \
        < /etc/nginx/site-templates/metrics.conf.template \
        > /etc/nginx/conf.d/default.conf
else
    envsubst '$PORT' \
        < /etc/nginx/site-templates/default.conf.template \
        > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
