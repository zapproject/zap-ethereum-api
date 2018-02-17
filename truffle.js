require('babel-register');
require('babel-polyfill');

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 9545,
            network_id: "*" 
        },
        "ganache-cli": {
            host: "localhost",
            port: 8545,
            network_id: "*",
        },
        "ganache-gui": {
            host: "localhost",
            port: 7545,
            network_id: "*" // Match any network id
        }
    }
};
