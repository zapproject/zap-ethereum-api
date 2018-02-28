var ZapBondage = artifacts.require("./ZapBondage.sol");
var ZapToken = artifacts.require("./ZapToken.sol");
var ZapRegistry = artifacts.require("./ZapRegistry.sol");
var ProxyDispatcher = artifacts.require("./library/ProxyDispatcher.sol");

module.exports = function(deployer) {
    ZapBondage.link("LibInterface", ProxyDispatcher.address);
    deployer.deploy(ZapBondage, ZapToken.address, ZapRegistry.address);
};