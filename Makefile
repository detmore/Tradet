.PHONY: dev prod logs stop migrate seed

dev:
	docker compose up postgres -d && sleep 2 && pnpm bot:dev & pnpm dev:web

prod:
	docker compose -f docker-compose.prod.yml up -d

logs-bot:
	docker compose -f docker-compose.prod.yml logs bot -f

logs-web:
	docker compose -f docker-compose.prod.yml logs web -f

stop:
	docker compose -f docker-compose.prod.yml down

migrate:
	pnpm db:push

seed:
	pnpm db:seed

test:
	pnpm --filter bot test
