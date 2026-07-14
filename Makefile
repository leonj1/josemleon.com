IMAGE := josemleon-com
CONTAINER := josemleon-com
PORT := 8099

.PHONY: build start stop restart

build:
	docker build -t $(IMAGE) .

start:
	docker run -d --name $(CONTAINER) -p $(PORT):80 $(IMAGE)

stop:
	docker rm -f $(CONTAINER)

restart: stop start
