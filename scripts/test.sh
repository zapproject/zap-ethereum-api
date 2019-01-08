#!/usr/bin/env bash

function cleanup {
    kill -9 $ganache_pid
}

trap cleanup EXIT

ganache-cli -p 8545 > /dev/null &
ganache_pid=$!
echo "Started ganache-cli, pid: $ganache_pid"

truffle test --network ganache-cli
