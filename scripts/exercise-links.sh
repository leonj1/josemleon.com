#!/usr/bin/env bash
# Crawl the running site with agent-browser and exercise every link.
#
# Internal links are visited in a real browser (BFS from the start page), so
# each page load also runs the SPA and fires its Web Vitals beacons. External
# links are checked with curl. Fails (exit 1) on any broken internal link,
# page error, or unreachable external link.
#
# Usage: scripts/exercise-links.sh [base-url]     (default http://localhost:8099)
set -u

BASE_URL="${1:-http://localhost:8099}"
BASE_URL="${BASE_URL%/}"
export AGENT_BROWSER_SESSION="linkcheck"

declare -A VISITED=()   # internal path -> HTTP-ish status ("ok" / "error")
declare -A EXTERNAL=()  # external url -> ""
declare -A MAILTO=()
QUEUE=("/")
FAILURES=0

cleanup() { agent-browser close --all >/dev/null 2>&1; }
trap cleanup EXIT

command -v agent-browser >/dev/null || { echo "agent-browser not found (npm i -g agent-browser)"; exit 2; }
curl -s -o /dev/null --max-time 5 "$BASE_URL/" || { echo "site not reachable at $BASE_URL (run 'make start')"; exit 2; }

normalize() { # strip fragment and trailing slash (except root)
  local u="${1%%#*}"
  u="${u%/}"
  [ -z "$u" ] && u="/"
  printf '%s' "$u"
}

links_on_current_page() {
  agent-browser snapshot -i -u 2>/dev/null \
    | grep -oE 'url=[^]]*' | sed 's/^url=//' | sort -u
}

echo "Crawling $BASE_URL ..."
agent-browser close --all >/dev/null 2>&1

while [ "${#QUEUE[@]}" -gt 0 ]; do
  path="${QUEUE[0]}"; QUEUE=("${QUEUE[@]:1}")
  [ -n "${VISITED[$path]:-}" ] && continue

  agent-browser open "$BASE_URL$path" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  agent-browser wait 1000 >/dev/null 2>&1

  page_errors="$(agent-browser errors 2>/dev/null)"
  if [ -n "$page_errors" ]; then
    VISITED[$path]="error"
    FAILURES=$((FAILURES + 1))
    echo "  FAIL $path (page errors below)"
    printf '%s\n' "$page_errors" | sed 's/^/       /'
    agent-browser errors --clear >/dev/null 2>&1
    continue
  fi
  VISITED[$path]="ok"
  echo "  ok   $path"

  while IFS= read -r url; do
    [ -z "$url" ] && continue
    case "$url" in
      "$BASE_URL"*)
        p="$(normalize "${url#"$BASE_URL"}")"
        [ -z "${VISITED[$p]:-}" ] && QUEUE+=("$p")
        ;;
      mailto:*) MAILTO[$url]="" ;;
      http*)    EXTERNAL[$url]="" ;;
    esac
  done < <(links_on_current_page)
done

echo
echo "Checking ${#EXTERNAL[@]} external link(s) with curl ..."
for url in "${!EXTERNAL[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -L -A 'Mozilla/5.0 (link-check)' "$url")"
  case "$code" in
    2*|3*) echo "  ok   $code $url" ;;
    000)   echo "  FAIL unreachable $url"; FAILURES=$((FAILURES + 1)) ;;
    *)     echo "  WARN $code $url (bot-blocking is common; verify manually)" ;;
  esac
done

echo
echo "Summary: ${#VISITED[@]} internal page(s), ${#EXTERNAL[@]} external link(s), ${#MAILTO[@]} mailto link(s), $FAILURES failure(s)"
[ "$FAILURES" -eq 0 ]
