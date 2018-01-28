var ZapRegistry = artifacts.require("./ZapRegistry.sol");

module.exports = function(deployer) {
    deployer.deploy(ZapRegistry);
};