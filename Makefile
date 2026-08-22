.PHONY: build start stop restart

build:
	docker compose build

start:
	docker compose up -d

stop:
	docker compose down

restart: stop start
