var TheToken = artifacts.require("./TheToken.sol");

module.exports = function(deployer) {
    deployer.deploy(TheToken);
};