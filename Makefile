.PHONY: build start stop restart test test-contract

build:
	docker compose build

start:
	docker compose up -d

stop:
	docker compose down

restart: stop start

test:
	cd metrics-ingest && npm run build && npm test
	npm run lint && npm run typecheck

test-contract:
	cd metrics-ingest && npm run compose:up && npm run test:contract && npm run compose:down
