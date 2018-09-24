const ZapCoordinator = artifacts.require('./ZapCoordinator.sol');
const ERCDotFactory = artifacts.require('./ERCDotFactory.sol');

const deploy = async function(deployer, network) {
    console.log("Deploying utility contracts on: " + network);

     if(ZapCoordinator.address) {

        await deployer.deploy(ERCDotFactory, ZapCoordinator.address);
        const dotFactoryInstance = ERCDotFactory.deployed(); 
     }
     else{
        console.log('ZapCoordinator not found');
     }
};

module.exports = (deployer, network) => {
    deployer.then(async () => await deploy(deployer, network));
};


