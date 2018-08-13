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

// TO EXEC: truffle migrate -f 4 -to 4 --network=kovan
const deploy = async function(deployer, network) {
    console.log("Deploying main contracts on: " + network);

    const redeployList = [
        { contract: Registry,    deploy: false, name: "REGISTRY" },
        { contract: CurrentCost, deploy: false, name: "CURRENT_COST" },
        { contract: Bondage,     deploy: false, name: "BONDAGE" },
        { contract: Arbiter,     deploy: false, name: "ARBITER" },
        { contract: Dispatch,    deploy: false, name: "DISPATCH" }
    ];

    // Hard code ZapCoordinator address
    if ( ZapCoordinator.address ) {
        let doUpdate = true;
        const coordInstance = await ZapCoordinator.at(ZapCoordinator.address);

        for ( const contract of redeployList ) {
            if ( contract.deploy ) {
                doUpdate = true;

                console.log('Updating', redeployList.name);

                await deployer.deploy(contract.contract, coordInstance.address);
                await sleep(network);

                console.log(contract.name, 'is now at', contract.contract.address);
                await coordInstance.updateContract(contract.name, contract.contract.address);
            }
        }

        if ( doUpdate ) {
            console.log('Updating all the dependencies');
            await coordInstance.updateAllDependencies();
        }
        else {
            console.log('No contracts require an update.');
        }
    }
    else {
        console.log('ZapCoordinator not found');
    }

    console.log('Done updating contracts');
};

module.exports = (deployer, network) => {
    deployer.then(async () => await deploy(deployer, network));
};

function sleep(network) {
    if ( network == "kovan" ) {
        return new Promise(resolve => setTimeout(resolve, 30000));
    } else {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
}
