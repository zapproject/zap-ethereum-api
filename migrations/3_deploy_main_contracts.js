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

  // Deploy all the coordinator
  await deployer.deploy(ZapCoordinator);
  const coordInstance = await ZapCoordinator.deployed();
  const owner = await coordInstance.owner();

  // Setup important contracts
  await deployer.deploy(Database);
  const dbInstance = await Database.deployed();
  await coordInstance.setContract('ZAP_TOKEN', ZapToken.address);
  await coordInstance.setContract('DATABASE', Database.address);


  // Deploy the rest of the contracts
  await deployer.deploy(Registry, ZapCoordinator.address);
  await deployer.deploy(CurrentCost, ZapCoordinator.address);
  await deployer.deploy(Bondage, ZapCoordinator.address);
  await deployer.deploy(Arbiter, ZapCoordinator.address);
  await deployer.deploy(Dispatch, ZapCoordinator.address);

  // Allow storage contracts to do storing
  await dbInstance.setStorageContract(Registry.address, true);
  await dbInstance.setStorageContract(Bondage.address, true);
  await dbInstance.setStorageContract(Arbiter.address, true);
  await dbInstance.setStorageContract(Dispatch.address, true);

  // Add the above contracts to the coordinator 
  await coordInstance.updateContract('REGISTRY', Registry.address);
  await coordInstance.updateContract('CURRENT_COST', CurrentCost.address);
  await coordInstance.updateContract('BONDAGE', Bondage.address);
  await coordInstance.updateContract('ARBITER', Arbiter.address);
  await coordInstance.updateContract('DISPATCH', Dispatch.address);

  await coordInstance.updateAllDependencies({ from: owner });

  // Deploy telegram example
  // await deployer.deploy(Telegram, Registry.address);
  console.log('Done');
};

function sleep(network) {
  if ( network == "kovan" ) {
    return new Promise(resolve => setTimeout(resolve, 30000));
  }
}
