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

const deploy = async function(deployer, network) {
    console.log("Deploying main contracts on: " + network);

    // Deploy all the coordinator
    console.log('Deploying the coordinator');
    await deployer.deploy(ZapCoordinator);
    const coordInstance = await ZapCoordinator.deployed();
    const owner = await coordInstance.owner();

    // Setup important contracts
    console.log('Deploying and instantiating important contracts');
    await deployer.deploy(Database);
    const dbInstance = await Database.deployed();
    await dbInstance.transferOwnership(ZapCoordinator.address);

    await coordInstance.addImmutableContract('ZAP_TOKEN', ZapToken.address);
    await coordInstance.addImmutableContract('DATABASE', Database.address);

    // Deploy the rest of the contracts
    console.log('Deploying the rest of the contracts');
    await deployer.deploy(Registry, ZapCoordinator.address);
    await deployer.deploy(CurrentCost, ZapCoordinator.address);
    await deployer.deploy(Bondage, ZapCoordinator.address);
    await deployer.deploy(Arbiter, ZapCoordinator.address);
    await deployer.deploy(Dispatch, ZapCoordinator.address);

    // Add the above contracts to the coordinator 
    console.log('Adding contracst to the coordinator');
    await coordInstance.updateContract('REGISTRY', Registry.address);
    await coordInstance.updateContract('CURRENT_COST', CurrentCost.address);
    await coordInstance.updateContract('BONDAGE', Bondage.address);
    await coordInstance.updateContract('ARBITER', Arbiter.address);
    await coordInstance.updateContract('DISPATCH', Dispatch.address);

    console.log('Updating all the dependencies');
    await coordInstance.updateAllDependencies({ from: owner });

    // Deploy telegram example
    console.log('Done migrating core contracts');
};

module.exports = (deployer, network) => {
    deployer.then(async () => await deploy(deployer, network));
};

function sleep(network) {
    if ( network == "kovan" ) {
        return new Promise(resolve => setTimeout(resolve, 30000));
    }
}
