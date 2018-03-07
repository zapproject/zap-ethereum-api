var ZapToken = artifacts.require("./ZapToken.sol");
var ZapFaucet = artifacts.require("./ZapFaucet.sol");

const owner = "0x0";

module.exports = function(deployer) {
    deployer.deploy(ZapFaucet, ZapToken.address, owner);
};