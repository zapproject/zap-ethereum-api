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
var Telegram = artifacts.require("./Telegram.sol");

module.exports = async function(deployer) {

  deployer.deploy(RegistryStorage).then(() => {
    return deployer.deploy(BondageStorage);
  }).then(() => {
    return deployer.deploy(ArbiterStorage);
  }).then(() => {
    return deployer.deploy(DispatchStorage);
  }).then(() => {
    return deployer.deploy(Registry, RegistryStorage.address);
  })
  .then (() => {
    return deployer.deploy(CurrentCost, Registry.address);
  })
  .then (() => {
    return deployer.deploy(Bondage, BondageStorage.address, "0x98dfab9c3d086f920aecc27dfe790af72d33e5b0", CurrentCost.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, ArbiterStorage.address, Bondage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, DispatchStorage.address, Bondage.address);
  }).then(async function(){
    RegistryStorage.deployed().then(instance => instance.transferOwnership(Registry.address));
    await sleep();
    BondageStorage.deployed().then(instance => instance.transferOwnership(Bondage.address));
    await sleep();
    ArbiterStorage.deployed().then(instance => instance.transferOwnership(Arbiter.address));
    await sleep();
    DispatchStorage.deployed().then(instance => instance.transferOwnership(Dispatch.address));
    await sleep();
    Bondage.deployed().then(async function(instance){
      instance.setArbiterAddress(Arbiter.address);
      await sleep();
      instance.setDispatchAddress(Dispatch.address);
      await sleep();
      instance.setCurrentCostAddress(CurrentCost.address);
    });
    await sleep();
    Dispatch.deployed().then(instance =>{
      instance.setBondage(Bondage.address);
    });
  });
};

function sleep() {
  return new Promise(resolve => setTimeout(resolve, 30000));
}
