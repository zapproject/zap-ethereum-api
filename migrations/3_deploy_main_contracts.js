const ZapCoordinator = artifacts.require('./ZapCoordinator.sol');
const Database = artifacts.require('./Database.sol');

const ArbiterStorage = artifacts.require("./ArbiterStorage.sol");
const BondageStorage = artifacts.require("./BondageStorage.sol");
const DispatchStorage = artifacts.require("./DispatchStorage.sol");
const RegistryStorage = artifacts.require("./RegistryStorage.sol");

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

  // Deploy the storage related contracts
  await deployer.deploy(RegistryStorage, ZapCoordinator.address);
  await deployer.deploy(BondageStorage, ZapCoordinator.address);
  await deployer.deploy(ArbiterStorage, ZapCoordinator.address);
  await deployer.deploy(DispatchStorage, ZapCoordinator.address);

  // Update the coordinator with the new contracts
  await coordInstance.updateContract('REGISTRY_STORAGE', RegistryStorage.address);
  await coordInstance.setContract('BONDAGE_STORAGE', BondageStorage.address);
  await coordInstance.updateContract('ARBITER_STORAGE', ArbiterStorage.address);
  await coordInstance.updateContract('DISPATCH_STORAGE', DispatchStorage.address);

  // Allow storage contracts to do storing
  await dbInstance.setStorageContract(RegistryStorage.address, true);
  await dbInstance.setStorageContract(BondageStorage.address, true);
  await dbInstance.setStorageContract(ArbiterStorage.address, true);
  await dbInstance.setStorageContract(DispatchStorage.address, true);

  // Deploy the rest of the contracts
  await deployer.deploy(Registry, ZapCoordinator.address);
  await deployer.deploy(CurrentCost, ZapCoordinator.address);
  await deployer.deploy(Bondage, ZapCoordinator.address);
  await deployer.deploy(Arbiter, ZapCoordinator.address);
  await deployer.deploy(Dispatch, ZapCoordinator.address);

  // Add the above contracts to the coordinator 
  await coordInstance.updateContract('REGISTRY', Registry.address);
  await coordInstance.updateContract('CURRENT_COST', CurrentCost.address);
  await coordInstance.updateContract('BONDAGE', Bondage.address);
  await coordInstance.updateContract('ARBITER', Arbiter.address);
  await coordInstance.updateContract('DISPATCH', Dispatch.address);

  // Transfer ownership
  await (await RegistryStorage.deployed()).transferOwnership(Registry.address);
  await sleep(network);
  await (await BondageStorage.deployed()).transferOwnership(Bondage.address);
  await sleep(network);
  await (await ArbiterStorage.deployed()).transferOwnership(Arbiter.address);
  await sleep(network);
  await (await DispatchStorage.deployed()).transferOwnership(Dispatch.address);
  await sleep(network);

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
