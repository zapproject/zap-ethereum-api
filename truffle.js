require('babel-register');
require('babel-polyfill');

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 9545,
            network_id: "development", 
            gas: "7500000",
            gasPrice: "4000000000"
        },
        app: {
            host: "localhost",
            port: 9545,
            network_id: "app", 
        },
        "ganache-cli": {
            host: "localhost",
            port: 8545,
            network_id: "*",
            gas: "6721975",
            gasPrice: "10000000"
        },
        "ganache-gui": {
            host: "localhost",
            port: 7545,
            network_id: "*" 
        },
        testRpc: {
            host: "127.0.0.1",
            port: 7545,
            network_id: 5777
        }
    }
};
