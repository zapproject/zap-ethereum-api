var ZapDispatchExample = artifacts.require("./ZapDispatchExample.sol");
var ZapDispatch = artifacts.require("./ZapDispatch.sol");
var ZapBondage = artifacts.require("./ZapBondage.sol");
var ZapToken = artifacts.require("./ZapToken.sol");


module.exports = function(deployer) {
    deployer.deploy(ZapDispatchExample, ZapToken.address, ZapDispatch.address, ZapBondage.address);
};