Install project dependencies
 - Install nodejs and npm
 - Install truffle: npm install truffle
 - Install uuid-parse package: npm install uuid-parse
 - Install babel: npm install babel-core babel-cli babel-preset-env; npm install babel-polyfill
 - Create file .babelrc in root directory and paste into it: { "presets": ["env"] }
 - Install chai: npm install chai; npm install chai-bignumber; npm install chai-as-promised
 - ```npm install truffle uuid-parse babel-core babel-cli babel-preset-env babel-polyfill chai chai-bignumber chai-as-promised```

To run tests
 - Start development blockchain: truffle develop
 - Start all tests: test
 - Start specified test file: test filename.js
 
To run docker-compose with parity private network
- Create .env file from .env.example with correct path to yours host localtime file.
- Run `docker-compose up`  
- Parity UI: `http://127.0.0.1:8180`
- Parity Ethereum RPC: `http://127.0.0.1:8545`

Software versions
 - Solidity v0.4.17
 - Truffle v4.0.5
 - Chai
 - Babel
 
![ZAP DFD](https://github.com/zapproject/FeedArbitration/blob/master/dataflow.png)



OVERVIEW

  The contracts repo serves as a curation market platform targeted at on-chain/off-chain data-providers. It allows data-providers to serve data to a variety of endpoints and to monetize data via provider-specific bonding markets in which data-consumers and/or speculators stake token amounts to data-provider accounts in exchange for data-provider-specific access tokens, ‘dots’, which are redeemable as :

 - query requests to the data-provider in request endpoints( ex. smart contract endpoint)

 - subscription periods to data-provider streams in subscription endpoints (ex. ipfs pubsub socket endpoint) or 

 - an amount of token determined by data-provider-specific bond market price

  The purpose of our NodeJS SDK is to allow developers to interface with our platform via an npm package. With the SDK, developers can

 - register data-providers on our backend via the Registry contract wrapper class

 - write feed-specific data-provider daemons via the Provider class to serve both queries and subscription requests
operate Ethereum/token wallets in their scripts

 - interact with our data-provider-specific bonding curves for data monetization and data-provider speculation 

 - Incorporate data streams into their scripts via the Subscriber class

 - develop endpoint-specific feed handlers such as IPFSHandler and OracleRequestHandler to be passed to Provider objects for custom request handling

What the SDK does not handle

 - account management

 - subscription storage

 - command line interface

Account management, subscription and additional configuration is in the StorageConfig repo and command-line interface in the CLI repo.

  Classes found in /src/api/ such as Provider, Subscriber, Wallet, etc interface with our platform’s smart contracts via contract wrappers contained in /src/api/contracts/. Familiarity with the core of the SDK (FeedArbitration) requires a nominal familiarity with the interface of our solidity contracts (ZapContracts/contracts), which function as our platform’s backend. 

  Below, contract description is followed by associated nodejs script descriptions. ‘TODO’ comment have been included where planned changes to the current iteration are relevant to the document.


CONTRACT+NODEJS INTERFACE

Contract Overview

  The ZapToken can be 'bonded' to any data provider in return for finite access to a provider's data based on provider defined access-token cost versus access-token supply curves. (

Currently we have 2 contracts to handle 2 kinds of endpoints:


 - Dispatch contract, which handles delivery and bond-market interface for smart contract endpoints (ex. a smart contract-powered futures contract for crypto-exchange prices which queries a data-provider, or "oracle", for BTC-ETH spot price at a timestamp)


 - Arbiter Contract, which handles data delivery and bond-market interface for temporal subscriptions. The first temporal subscription endpoint we are building out consists of IPFS Publisher/Subscriber socket subscriptions. (ex. user wishes to subscribe to a real time data feed for 2 hours)

Data providers themselves are represented as structures within the Registry contract where public keys for data/query encryption, account addresses, bond pricing parameters and endpoint-specific parameters are housed.

Bonding is performed via the Bondage contract, which 

 - defines the available pricing curves in plots of access-cost(dot-cost) versus access-supply(dot-supply) based on provider defined parameters

 - calculates request/subscription prices for given data providers via 'dot' prices. A dot represents the right to perform 1 request ( in the case of smart contract endpoints) or 1 ethereum block-time of subscription ( in the case of temporal subscription endpoints) 

 - holds dots(access tokens) in escrow between user and provider during subscriptions and pending transactions

 - allows token to be bonded for dots at price defined by point on provider specific access-cost(dot-cost) versus access-supply(dot-supply) curves

 - allows dots to be burned for token at price defined by point on provider specific access-cost(dot-cost) versus access-supply(dot-supply) curves



### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

v0.1
