var RegistryStorage = artifacts.require("./RegistryStorage.sol");
var Registry = artifacts.require("./Registry.sol");
var BondageStorage = artifacts.require("./BondageStorage.sol");
var Bondage = artifacts.require("./Bondage.sol");
var ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
var Arbiter = artifacts.require("./Arbiter.sol");
var DispatchStorage = artifacts.require("./DispatchStorage.sol");
var Dispatch = artifacts.require("./Dispatch.sol");
var TheToken = artifacts.require("./TheToken.sol");
var CurrentCost = artifacts.require("./aux/CurrentCost.sol")
var ZapFaucet = artifacts.require("./ZapFaucet.sol")

const owner = "0x0";

module.exports = function(deployer) {
  deployer.deploy([RegistryStorage, BondageStorage, ArbiterStorage, DispatchStorage, CurrentCost])
  .then (() => {
  	return deployer.deploy(Registry, RegistryStorage.address);
  })
  .then (() => {
  	return deployer.deploy(Bondage, BondageStorage.address, Registry.address, TheToken.address, CurrentCost.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, ArbiterStorage.address, Bondage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, DispatchStorage.address, Bondage.address);
  })
  .then(() => {
    return deployer.deploy(ZapFaucet, TheToken.address, owner);
  });
};
