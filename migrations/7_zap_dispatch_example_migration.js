var ZapDispatchExample = artifacts.require("./ZapDispatchExample.sol");
var ZapDispatch = artifacts.require("./ZapDispatch.sol");
var ZapBondage = artifacts.require("./ZapBondage.sol");
var ZapToken = artifacts.require("./ZapToken.sol");
var ZapRegistry = artifacts.require("./ZapRegistry.sol");


module.exports = function(deployer) {
    deployer.deploy(ZapDispatchExample, ZapToken.address, ZapDispatch.address, ZapBondage.address, ZapRegistry.address);
};