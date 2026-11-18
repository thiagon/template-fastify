s ?=

.PHONY: build dev watch stop clear logs

build:
	docker compose build $(s)

dev:
	docker compose up -d

watch:
	docker compose watch --prune $(s)

stop:
	docker compose down

clear:
	docker compose down --volumes --rmi local --remove-orphans

logs:
	docker compose logs -f $(s)
