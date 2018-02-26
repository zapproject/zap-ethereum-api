var ZapRegistry = artifacts.require("./ZapRegistry.sol");
var ProxyDispatcher = artifacts.require("./library/ProxyDispatcher.sol");

module.exports = function(deployer) {
   ZapRegistry.link("LibInterface", ProxyDispatcher.address);
   deployer.deploy(ZapRegistry);
};