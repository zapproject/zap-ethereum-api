var ZapToken = artifacts.require("./ZapToken.sol");

module.exports = function(deployer) {
    deployer.deploy(ZapToken);
};
