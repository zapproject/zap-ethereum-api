#!/bin/sh

# default init network
if ![ $1 ]; then
  docker-compose stop nodejs bootstrap && \
  docker-compose -f docker-compose.yml up --build -d
else
  # run command in nodejs
  docker-compose exec nodejs $@
fi
