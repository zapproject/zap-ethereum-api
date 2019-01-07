# Zap

## Install project dependencies

- Install nodejs and npm
- Install nodejs deps via `npm install`

## Running tests

To execute all tests:

```
$ npm run test
```

To execute a particular test:

```
$ npm run develop
> test {filename}.js
```

## Running docker-compose with parity private network

- Create .env file from .env.example with correct path to yours host localtime file.
- Run `docker-compose up`
- Parity UI: `http://127.0.0.1:8180`
- Parity Ethereum RPC: `http://127.0.0.1:8545`

## Software versions

Reference `package.json` for currently-utilized software versions.

![ZAP DFD](https://github.com/zapproject/FeedArbitration/blob/master/dataflow.png)

Documentation at
[zap.tech](http://zap.tech)


## Overview

The contracts repo serves as a curation market platform targeted at on-chain/off-chain data-providers. It allows data-providers to serve data to a variety of endpoints and to monetize data via provider-specific bonding markets in which data-consumers and/or speculators stake token amounts to data-provider accounts in exchange for data-provider-specific access tokens, ‘dots’, which are redeemable as:

 - query requests to the data-provider in request endpoints( ex. smart contract endpoint)

 - subscription periods to data-provider streams in subscription endpoints (ex. ipfs pubsub socket endpoint) or

 - an amount of token determined by data-provider-specific bond market price

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

v0.1
