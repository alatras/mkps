##
# This make file is only for development with docker compose
##

up:
	docker-compose up -d
	docker logs --follow marketplace-nest-be-api-1
	sleep 10
	docker exec mongo1 /scripts/rs-init.sh

down:
	docker-compose down

restart:
	make down
	make up