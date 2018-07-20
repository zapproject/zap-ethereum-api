var RegistryStorage = artifacts.require("./RegistryStorage.sol");
var Registry = artifacts.require("./Registry.sol");
var BondageStorage = artifacts.require("./BondageStorage.sol");
var Bondage = artifacts.require("./Bondage.sol");
var ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
var Arbiter = artifacts.require("./Arbiter.sol");
var DispatchStorage = artifacts.require("./DispatchStorage.sol");
var Dispatch = artifacts.require("./Dispatch.sol");
// Kovan token address: 0x98dfab9c3d086f920aecc27dfe790af72d33e5b0
var ZapToken = artifacts.require("./ZapToken.sol");
var CurrentCost = artifacts.require("./CurrentCost.sol");
var Telegram = artifacts.require("./Telegram.sol");
var Faucet = artifacts.require("./Faucet.sol");

module.exports = async function(deployer, network) {
  console.log("Deploying main contracts on: " + network);

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
    return deployer.deploy(Bondage, BondageStorage.address, ZapToken.address, CurrentCost.address);
  })
  .then (() => {
    return deployer.deploy(Arbiter, ArbiterStorage.address, Bondage.address);
  })
  .then (() => {
    return deployer.deploy(Dispatch, DispatchStorage.address, Bondage.address);
  }).then(async function(){
    RegistryStorage.deployed().then(instance => instance.transferOwnership(Registry.address));
    await sleep(network);
    BondageStorage.deployed().then(instance => instance.transferOwnership(Bondage.address));
    await sleep(network);
    ArbiterStorage.deployed().then(instance => instance.transferOwnership(Arbiter.address));
    await sleep(network);
    DispatchStorage.deployed().then(instance => instance.transferOwnership(Dispatch.address));
    await sleep(network);
    Bondage.deployed().then(async function(instance){
      instance.setArbiterAddress(Arbiter.address);
      await sleep(network);
      instance.setDispatchAddress(Dispatch.address);
      await sleep(network);
      instance.setCurrentCostAddress(CurrentCost.address);
    });
    await sleep(network);
    Dispatch.deployed().then(instance =>{
      instance.setBondage(Bondage.address);
    });
    await sleep(network);
    deployer.deploy(Telegram, Registry.address);
  });
};

function sleep(network) {
  if(network == "kovan"){
    return new Promise(resolve => setTimeout(resolve, 30000));
  }
}
