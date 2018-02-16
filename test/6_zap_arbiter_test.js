const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const ZapRegistry = artifacts.require("ZapRegistry");

import EVMRevert from './helpers/EVMRevert';


const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("TestZapBondage");
const ZapDispatch = artifacts.require("ZapDispatch");
const ZapArbiter = artifacts.require("ZapArbiter"); 

const deployZapToken = () => {
    return ZapToken.new();
};

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const deployZapBondage = (tokenAddress, registryAddress) => {
    return ZapBondage.new(tokenAddress, registryAddress);
};

const deployTestOracle = () => {
    return Oracle.new();
}

const deployZapDispatch = () => {
    return ZapDispatch.new();
};

const deployZapArbiter = (bondageAddress, registryAddress) => {
    return ZapArbiter.new(bondageAddress, registryAddress);
};


contract('ZapBondage', function (accounts) {
    const owner = accounts[0];
    const provider = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];

    const specifier = new String("test-specifier");
    const curveLinear = CurveTypes["Linear"];
    const start = 1;
    const mul = 2;

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    it("ZAP_BONDAGE_1 - bond() - Check bond function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        const res = await zapBondage.bond(specifier.valueOf(), 100, oracle, {from: provider});
    });

});