## Runs Redis and Mongo with replica set locally for local development
#!/bin/bash

docker compose down

if [[ $(docker ps -a -q) ]]
then
  docker stop $(docker ps -a -q)
fi

docker network create mongoCluster || true
docker volume create mongo-1-volume
docker volume create mongo-2-volume
docker volume create mongo-3-volume
docker volume create redis-volume

docker run -d --rm -p 6379:6379 --name redis --network mongoCluster -v redis-volume:/data/redis redis:latest &&
docker run -d --rm -p 27017:27017 --name mongo1 --network mongoCluster -v mongo-1-volume:/data/mongo1 mongo:5 mongod --replSet myReplicaSet --bind_ip localhost,mongo1 &&
docker run -d --rm -p 27018:27017 --name mongo2 --network mongoCluster -v mongo-2-volume:/data/mongo2 mongo:5 mongod --replSet myReplicaSet --bind_ip localhost,mongo2 &&
docker run -d --rm -p 27019:27017 --name mongo3 --network mongoCluster -v mongo-3-volume:/data/mongo3 mongo:5 mongod --replSet myReplicaSet --bind_ip localhost,mongo3 &&

docker exec -it mongo1 mongosh --eval "rs.initiate({
_id: \"myReplicaSet\",
members: [
{_id: 0, host: \"mongo1\"},
  {_id: 1, host: \"mongo2\"},
  {_id: 2, host: \"mongo3\"}
]
})" &&

docker exec -it mongo1 mongosh --eval "rs.secondaryOk()"

############ Alternative script ##########################
# docker compose down
# docker stop mongo1 mongo2 mongo3 redis marketPlace
# docker rm -f mongo1 mongo2 mongo3 redis marketPlace

# docker-compose up -d mongo1
# docker-compose up -d mongo2
# docker-compose up -d mongo3
# docker-compose up -d redis

# docker exec -it mongo1 mongosh --eval "rs.initiate({
# _id: \"marketPlaceReplicaSet\",
# members: [
#   {_id: 0, host: \"mongo1\"},
#   {_id: 1, host: \"mongo2\"},
#   {_id: 2, host: \"mongo3\"}
# ]
# })" || true &&

# docker exec -it mongo1 mongosh --eval "rs.secondaryOk()"
############################################################
