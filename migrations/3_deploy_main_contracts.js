var AddressSpacePointer = artifacts.require("./AddressSpacePointer");
var AddressSpace = artifacts.require("./AddressSpace");
var RegistryStorage = artifacts.require("./RegistryStorage.sol");
var Registry = artifacts.require("./Registry.sol");
var BondageStorage = artifacts.require("./BondageStorage.sol");
var Bondage = artifacts.require("./Bondage.sol");
var ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
var Arbiter = artifacts.require("./Arbiter.sol");
var DispatchStorage = artifacts.require("./DispatchStorage.sol");
var Dispatch = artifacts.require("./Dispatch.sol");
var TheToken = artifacts.require("./TheToken.sol");
var CurrentCost = artifacts.require("./CurrentCost.sol");
var Update = artifacts.require("./Update.sol");

module.exports = function(deployer) {
  deployer.deploy([RegistryStorage, BondageStorage, ArbiterStorage, DispatchStorage, AddressSpacePointer])
  .then (() => {
    return deployer.deploy(Registry, RegistryStorage.address);
  })
  .then (() => {
    return deployer.deploy(CurrentCost, AddressSpacePointer.address);
  })
  .then (() => {
    return deployer.deploy(Bondage, AddressSpacePointer.address, BondageStorage.address, TheToken.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, AddressSpacePointer.address, ArbiterStorage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, AddressSpacePointer.address, DispatchStorage.address);
  })
  .then (() => {
    return deployer.deploy(AddressSpace, Registry.address, Bondage.address, Arbiter.address, Dispatch.address, CurrentCost.address);
  })
  .then (() => {
    AddressSpacePointer.deployed().then(instance => instance.setAddressSpace(AddressSpace.address));
  })
  .then (() => {
    return deployer.deploy(Update, AddressSpacePointer.address);
  })
  .then (() => {
    RegistryStorage.deployed().then(instance => instance.transferOwnership(Registry.address));
    BondageStorage.deployed().then(instance => instance.transferOwnership(Bondage.address));
    ArbiterStorage.deployed().then(instance => instance.transferOwnership(Arbiter.address));
    DispatchStorage.deployed().then(instance => instance.transferOwnership(Dispatch.address));
    Update.deployed().then(instance => instance.updateContracts());
  });
};