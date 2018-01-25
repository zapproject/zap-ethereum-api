var ZapBondage = artifacts.require("./ZapBondage.sol");
var ZapToken = artifacts.require("./ZapToken.sol");
var ZapRegistry = artifacts.require("./ZapRegistry.sol");

module.exports = function(deployer) {
    deployer.deploy(ZapBondage, ZapToken.address, ZapRegistry.address);
};