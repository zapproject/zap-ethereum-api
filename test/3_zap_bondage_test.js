const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();
require('./helpers/utils');

const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("ZapBondage");

import EVMRevert from './helpers/EVMRevert';

const deployZapToken = () => {
    return ZapToken.new();
};

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const deployZapBondage = (tokenAddress, registryAddress) => {
    return ZapBondage.new(tokenAddress, registryAddress);
};

const curveTypes = {
    "None": 0,
    "Linier": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

contract('ZapBondage', function (accounts) {
    const owner = accounts[0];
    const provider = account[1];

    it("ZAP_BONDAGE_1 - Check bond function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);


        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner });


        await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        await zapToken.allocate(provider, 5000 * DECIMALS, { from: owner });
        await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: provider});

        const res = await zapBondage.bond(specifier.valueOf(), 1000, owner, {from: owner});
        console.log(res)

    });
});