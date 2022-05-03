#!/bin/bash

touch /usr/src/app/logs/application.log
cat /proc/1/fd/1 > /usr/src/app/logs/application.log &
#ln -sf /proc/1/fd/1 /usr/src/app/logs/application.log

npm start
