var RegistryStorage = artifacts.require("./RegistryStorage.sol");
var Registry = artifacts.require("./Registry.sol");
var BondageStorage = artifacts.require("./BondageStorage.sol");
var Bondage = artifacts.require("./Bondage.sol");
var ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
var Arbiter = artifacts.require("./Arbiter.sol");
var DispatchStorage = artifacts.require("./DispatchStorage.sol");
var Dispatch = artifacts.require("./Dispatch.sol");
var ZapToken = artifacts.require("./ZapToken.sol");
var CurrentCost = artifacts.require("./CurrentCost.sol");

module.exports = function(deployer) {
  deployer.deploy([RegistryStorage, BondageStorage, ArbiterStorage, DispatchStorage])
  .then (() => {
    return deployer.deploy(Registry, RegistryStorage.address);
  })
  .then (() => {
    return deployer.deploy(CurrentCost, Registry.address);
  })
  .then (() => {
    return deployer.deploy(Bondage, BondageStorage.address, ZapToken.address, CurrentCost.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, ArbiterStorage.address, Bondage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, DispatchStorage.address, Bondage.address);
  })
  .then (() => {
    RegistryStorage.deployed().then(instance => instance.transferOwnership(Registry.address));
    BondageStorage.deployed().then(instance => instance.transferOwnership(Bondage.address));
    ArbiterStorage.deployed().then(instance => instance.transferOwnership(Arbiter.address));
    DispatchStorage.deployed().then(instance => instance.transferOwnership(Dispatch.address));
  });
};
