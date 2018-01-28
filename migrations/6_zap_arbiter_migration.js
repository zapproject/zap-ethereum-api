var ZapArbiter = artifacts.require("./ZapArbiter.sol");
var ZapBondage = artifacts.require("./ZapBondage.sol");
var ZapRegistry = artifacts.require("./ZapRegistry.sol");

module.exports = function(deployer) {
    deployer.deploy(ZapArbiter, ZapBondage.address, ZapRegistry.address);
};
