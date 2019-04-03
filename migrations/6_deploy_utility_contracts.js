const ZapCoordinator = artifacts.require('./ZapCoordinator.sol');
const TokenFactory = artifacts.require('./TokenFactory.sol');
const TokenDotFactory = artifacts.require('./TokenDotFactory.sol');
const web3Utils = require('web3-utils');
const title = web3Utils.utf8ToHex("TokenDotFactory");
const pubkey = web3Utils.toBN("036b5252a719be12e4aa87faf67a410ce894d0f79a997fc21ee379ff3d");

const deploy = async function(deployer, network) {
  console.log("Deploying utility contracts on: " + network);
  console.log(ZapCoordinator.address, TokenFactory.address, pubkey, title);

  sleep(network);
  if (ZapCoordinator.address) {
    await deployer.deploy(TokenDotFactory, ZapCoordinator.address, TokenFactory.address, pubkey, title);
    const TokenDotFactoryInstance = TokenDotFactory.deployed();
  } else {
    console.log('ZapCoordinator not found');
  }
};

module.exports = (deployer, network) => {
  deployer.then(async () => await deploy(deployer, network));
};

function sleep(network) {
  if (network == "kovan") {
    return new Promise(resolve => setTimeout(resolve, 200000));
  }
}