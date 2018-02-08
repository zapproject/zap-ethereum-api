const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();
require('./helpers/utils');

const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("ZapBondage");
const Oracle = artifacts.require("TestOracle");

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

const deployTestOracle = () => {
    return Oracle.new();
}

const curveTypes = {
    "None": 0,
    "Linier": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

const DECIMALS = 1000000000000000000;

contract('ZapBondage', function (accounts) {
    const owner = accounts[0];
    const provider = accounts[1];

    it("ZAP_BONDAGE_1 - Check bond function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });

        await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        await zapToken.allocate(provider, 5000 * DECIMALS, { from: owner });
        await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: provider});

        const res = await zapBondage.bond(specifier.valueOf(), 100, provider, {from: provider});
    });

    it("ZAP_BONDAGE_2 - Check that bond will not performed if provider was not approve tokens", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });

        let dotsAndZap = await zapBondage.calcZap.call(provider, specifier.valueOf(), 100, {from: provider});
        console.log("dots count for zap tokens: ", dotsAndZap[1].valueOf());
        console.log("number of zap for bonding: ", dotsAndZap[0].valueOf());


        //await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        //await zapToken.allocate(provider, 5000 * DECIMALS, { from: owner });
        //await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: provider});

        //zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_3 - Check that bond will not performed if provider or curve is not initialzied", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        //await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: provider });
        //await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });

        await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        await zapToken.allocate(provider, 5000 * DECIMALS, { from: owner });
        await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: provider});

        zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });
});