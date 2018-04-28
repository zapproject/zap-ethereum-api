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
            host: "172.18.0.3",
            port: 8545,
            network_id: "*",
            from: "010e49e47cbb34e67c072702ed6f4d8b273f751f"// must first account in accounts[] array inside tests
    	}, 
        metamask_ropsten: {
            provider: new HDWalletProvider(pk, "https://ropsten.infura.io/8PB8Cnu6sYpZu5VVtEDl"),
           //from: "0x00D6e29C51FFeAbE5ad1468f34780EbC494Ac513",
            network_id: 3,
            gas: 4612388
        }
   }
};
