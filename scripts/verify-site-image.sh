#!/bin/sh
set -eu

IMAGE="site-image-verify:$$"
PLAIN_CONTAINER="site-verify-plain-$$"
MISSING_CONTAINER="site-verify-missing-$$"
PROXY_CONTAINER="site-verify-proxy-$$"
MISSING_STDERR="${TMPDIR:-/tmp}/site-verify-missing-$$.stderr"

cleanup() {
    docker rm -f "$PLAIN_CONTAINER" "$MISSING_CONTAINER" "$PROXY_CONTAINER" >/dev/null 2>&1 || true
    rm -f "$MISSING_STDERR"
    docker rmi "$IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

fail() {
    echo "verify-site-image: $*" >&2
    exit 1
}

docker build -t "$IMAGE" .

docker run -d --name "$PLAIN_CONTAINER" "$IMAGE" >/dev/null

ready=0
i=0
while [ "$i" -lt 30 ]; do
    if docker exec "$PLAIN_CONTAINER" wget -q -O - http://127.0.0.1/ >/dev/null 2>&1; then
        ready=1
        break
    fi
    i=$((i + 1))
    sleep 1
done
[ "$ready" -eq 1 ] || fail "plain container did not become ready"

home_response=$(docker exec "$PLAIN_CONTAINER" wget -S -O - http://127.0.0.1/ 2>&1) || fail "GET / failed"
echo "$home_response" | grep -Eq 'HTTP/[0-9.]+ 200' || fail "GET / did not return 200"
echo "$home_response" | grep -q '<!doctype html' || fail "GET / did not return SPA HTML"

metrics_response=$(docker exec "$PLAIN_CONTAINER" sh -c 'wget -S --post-data="{}" -O - http://127.0.0.1/metrics' 2>&1 || true)
echo "$metrics_response" | grep -Eq 'HTTP/[0-9.]+ (404|405)' || fail "plain POST /metrics was not rejected as a local route"
echo "$metrics_response" | grep -q 'HTTP/[0-9.]+ 502' && fail "plain POST /metrics was proxied"

if docker run --name "$MISSING_CONTAINER" -e METRICS_PROXY=1 "$IMAGE" 2>"$MISSING_STDERR"; then
    fail "missing INGEST_PORT container unexpectedly started"
fi
grep -q 'INGEST_PORT is required' "$MISSING_STDERR" || fail "missing INGEST_PORT error was not reported"

docker run -d --name "$PROXY_CONTAINER" \
    --add-host metrics-ingest:127.0.0.1 \
    -e METRICS_PROXY=1 -e INGEST_PORT=9091 "$IMAGE" >/dev/null
proxy_config=''
i=0
while [ "$i" -lt 30 ]; do
    if proxy_config=$(docker exec "$PROXY_CONTAINER" cat /etc/nginx/conf.d/default.conf 2>/dev/null); then
        break
    fi
    i=$((i + 1))
    sleep 1
done
[ "$(docker inspect -f '{{.State.Running}}' "$PROXY_CONTAINER")" = true ] || fail "proxy container did not stay up"
echo "$proxy_config" | grep -q 'proxy_pass http://metrics-ingest:9091/metrics' || fail "proxy config was not rendered correctly"

echo "verify-site-image: passed"
