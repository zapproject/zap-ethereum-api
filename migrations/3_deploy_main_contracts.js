var RegistryStorage = artifacts.require("./RegistryStorage.sol");
var Registry = artifacts.require("./Registry.sol");
var BondageStorage = artifacts.require("./BondageStorage.sol");
var Bondage = artifacts.require("./Bondage.sol");
var ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
var Arbiter = artifacts.require("./Arbiter.sol");
var DispatchStorage = artifacts.require("./DispatchStorage.sol");
var Dispatch = artifacts.require("./Dispatch.sol");
var TheToken = artifacts.require("./TheToken.sol");

module.exports = function(deployer) {
  deployer.deploy([RegistryStorage, BondageStorage, ArbiterStorage, DispatchStorage])
  .then (() => {
  	return deployer.deploy(Registry, RegistryStorage.address);
  })
  .then (() => {
  	return deployer.deploy(Bondage, BondageStorage.address, Registry.address, TheToken.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, ArbiterStorage.address, Bondage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, DispatchStorage.address, Bondage.address);
  });
};
