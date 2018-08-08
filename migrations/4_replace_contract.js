const ZapCoordinator = artifacts.require('./ZapCoordinator.sol');
const Database = artifacts.require('./Database.sol');

const Arbiter = artifacts.require("./Arbiter.sol");
const Bondage = artifacts.require("./Bondage.sol");
const CurrentCost = artifacts.require("./CurrentCost.sol");
const Dispatch = artifacts.require("./Dispatch.sol");
const Registry = artifacts.require("./Registry.sol");

const Faucet = artifacts.require("./Faucet.sol");
const Telegram = artifacts.require("./Telegram.sol");
const ZapToken = artifacts.require("./ZapToken.sol");

module.exports = async function(deployer, network) {
  console.log("Deploying main contracts on: " + network);

  //var contractList = [Registry, CurrentCost, Bondage, Arbiter, Dispatch];
  var redeployList = {
    "REGISTRY": false,
    "CURRENT_COST": false, 
    "BONDAGE": true, 
    "ARBITER": false, 
    "DISPATCH": false
  };

  // Hard code ZapCoordinator address
  var coordInstance = await ZapCoordinator.at("0x7393baa2e736a351ca9e23b53952508e554978d1");

  if(redeployList["REGISTRY"]){
    await deployer.deploy(Registry, coordInstance.address);
    await sleep(network);
    await coordInstance.updateContract("REGISTRY", Registry.address);
  } 

  if(redeployList["CURRENT_COST"]){
    await deployer.deploy(CurrentCost, coordInstance.address);
    await sleep(network);
    await coordInstance.updateContract("CURRENT_COST", CurrentCost.address);
  }

  if(redeployList["BONDAGE"]){

    await deployer.deploy(Bondage, coordInstance.address);
    await sleep(network);
    await coordInstance.updateContract("BONDAGE", Bondage.address);
  } 

  if(redeployList["ARBITER"]){
    await deployer.deploy(Arbiter, coordInstance.address);
    await sleep(network);
    await coordInstance.updateContract("ARBITER", Arbiter.address);
  } 

  if(redeployList["DISPATCH"]){
   await deployer.deploy(Dispatch, coordInstance.address);
   await sleep(network);
   await coordInstance.updateContract("DISPATCH", Dispatch.address);
 } 
 await coordInstance.updateAllDependencies();
 console.log('Done updating contracts');
 process.exit(0);
};

function sleep(network) {
  if ( network == "kovan" ) {
    return new Promise(resolve => setTimeout(resolve, 30000));
  } else {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
}
