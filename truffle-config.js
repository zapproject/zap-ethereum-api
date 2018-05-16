require('babel-register');
require('babel-polyfill');


const HDWalletProvider = require("truffle-hdwallet-provider-privkey");

var pk = "b08f8e222f68ec1a77c3c76948ffe119dd0144a8b98aeb65beb02d1d467c9d8a";

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 9545,
            network_id: "*", 
            gas: "7500000",
            gasPrice: "4000000000"
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
	docker: {
            host: "bootstrap",
            port: 8545,
            network_id: "*",
            from: "0x010e49e47cbb34e67c072702ed6f4d8b273f751f"// must be first account in accounts[] array inside tests
    	},
        "docker-local": {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
            from: "0x010e49e47cbb34e67c072702ed6f4d8b273f751f"// must be first account in accounts[] array inside tests
        }
    }
};
