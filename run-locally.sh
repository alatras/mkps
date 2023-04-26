#!/bin/bash

# Install MongoDB on the local machine and start the MongoDB instances and replica set for local development
os_type="$(uname)"
if [[ "$os_type" == "Darwin" ]]; then
    echo "This is a Mac."

    # Getting MongoDB if not running
    if pgrep mongod >/dev/null 2>&1; then
        echo "MongoDB is running"
    else
        echo "Installing MongoDB..."
        brew update
        brew tap mongodb/brew
        brew install mongodb-community
        brew install mongodb-community-shell
        echo "Starting MongoDB..."
        brew services start mongodb-community
    fi

    # Getting Redis if not running
    if pgrep redis-server >/dev/null 2>&1; then
        echo "Redis server is running"
    else
        echo "Installing Redis..."
        brew install redis
        echo "Starting Redis server..."
        redis-server &
    fi

elif [[ "$os_type" == "Linux" ]]; then
    echo "This is a Linux system."

    # Getting MongoDB if not running
    if pgrep mongod >/dev/null 2>&1; then
        echo "MongoDB is running"
    else
        echo "Installing MongoDB..."
        wget -qO - https://www.mongodb.org/static/pgp/server-6.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.list
        sudo apt-get update
        sudo apt-get install -y mongodb-org
        sudo apt-get mongodb
        echo "Starting MongoDB..."
        sudo systemctl start mongod
        sudo systemctl enable mongod
    fi

    # Getting Redis if not running
    if pgrep redis-server >/dev/null 2>&1; then
        echo "Redis server is running"
    else
        echo "Installing Redis..."
        sudo apt-get install -y redis-server
        echo "Starting Redis server..."
        sudo systemctl start redis
    fi
else
    echo "Unknown operating system."
fi

# Create the data directories
mkdir -p ~/data/rs0
mkdir -p ~/data/rs1
mkdir -p ~/data/rs2

# Start the MongoDB instances in the background
mongod --replSet rs0 --dbpath ~/data/rs0 --port 27017 --bind_ip localhost --logpath ~/data/rs0/mongodb.log &
mongod --replSet rs0 --dbpath ~/data/rs1 --port 27018 --bind_ip localhost --logpath ~/data/rs1/mongodb.log &
mongod --replSet rs0 --dbpath ~/data/rs2 --port 27019 --bind_ip localhost --logpath ~/data/rs2/mongodb.log &

# Wait for MongoDB instances to start
sleep 10

# Configure the replica set in the background
mongo --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}, {_id: 1, host: "localhost:27018"}, {_id: 2, host: "localhost:27019"}]})' &

# Wait for replica set to be initiated
sleep 10

# Create the "marketplace-be" database in the background
mongo --eval 'use marketplace-be' &

# Start the local development server
npm run dev:local
