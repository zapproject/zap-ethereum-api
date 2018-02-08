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
    "Exponential": 2,
    "Logarithmic": 3
}

const DECIMALS = 1000000000000000000;

function calculateZapWithLinearCurve(dotsRequired, startValue, multiplier) {
    let zap = 0;
    for (let i = 0; i < dotsRequired; i++) {
        zap += multiplier * i + startValue
    }
    return zap;
}

function calculateZapWithExponentialCurve(dotsRequired, startValue, multiplier) {
    let zap = 0;
    for (let i = 0; i < dotsRequired; i++) {
        zap += multiplier * Math.pow(i, 2) + startValue;
    }
    return zap;
}

function calculateZapWithLogarithmicCurve(dotsRequired, startValue, multiplier) {
    let zap = 0;
    for (let i = 0; i < dotsRequired; i++) {
        let totalBound = i;
        if (totalBound == 0) {
            totalBound = 1;
        }
        zap += multiplier * Math.log2(totalBound) + startValue;
    }
    return Math.ceil(zap);
}

contract('ZapBondage', function (accounts) {
    const owner = accounts[0];
    const provider = accounts[1];

    it("ZAP_BONDAGE_1 - bond() - Check bond function", async function () {
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

        const res = await zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider});
    });

    it("ZAP_BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {
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

        //zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {
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
        //await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });


        await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        await zapToken.allocate(provider, 5000 * DECIMALS, { from: owner });
        await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: provider});

       // zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_4 - unbond() - Check unbond function", async function () {
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

        await zapBondage.bond(specifier.valueOf(), 1000, oracle.address, {from: provider});

        await zapBondage.unbond(specifier.valueOf(), 500, oracle.address, {from: provider});
    });

    it("ZAP_BONDAGE_4 - calcZapForDots() - Check zap for dots calculatnig", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-specifier");
        const curveLinear = curveTypes["Linier"];
        const curveExponential = curveTypes["Exponential"];
        const curveLogarithmic = curveTypes["Logarithmic"];
        const start = 1;
        const mul = 2;

       
        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        const jsLinearZap = calculateZapWithLinearCurve(5, start, mul);
        console.log("js linear calc zap results: ", jsLinearZap);
        const res1 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5]);
        console.log("eth linear calc zap results: ", res1);
        const ethLinearZap = parseInt(res1.valueOf());

        jsLinearZap.should.be.equal(ethLinearZap);


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[6] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveExponential, start, mul, { from: accounts[6] });
        const jsExponentialZap = calculateZapWithExponentialCurve(5, start, mul);
        console.log("js exponential calc zap results: ", jsExponentialZap);
        const res2 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[6]);
        console.log("eth exponential calc zap results: ", res2);
        const ethExponentialZap = parseInt(res2.valueOf());

        jsExponentialZap.should.be.equal(ethExponentialZap);


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[7] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLogarithmic, start, mul, { from: accounts[7] });
        const jsLogarithmicZap = calculateZapWithLogarithmicCurve(5, start, mul);
        console.log("js logarithmic calc zap results: ", jsLogarithmicZap);
        const res3 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[7]);
        console.log("eth logarithmic calc zap results: ", res3);
        const ethLogarithmicZap = parseInt(res3.valueOf());

        jsLogarithmicZap.should.be.equal(ethLogarithmicZap);
    });

    it("ZAP_BONDAGE_5 - calcZapForDots() - Check that zap number is 0 if curve not initialized", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-specifier");
        const curveLinear = curveTypes["Linier"];
        const curveExponential = curveTypes["Exponential"];
        const curveLogarithmic = curveTypes["Logarithmic"];
        const start = 1;
        const mul = 2;

       
        // await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        // await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        const res1 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5]);
        console.log("eth linear calc zap results: ", res1);
        const ethLinearZap = parseInt(res1.valueOf());

        ethLinearZap.should.be.equal(0);
    });

    it("ZAP_BONDAGE_6 - calcZap() - Check calcZap function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let oracle = await deployTestOracle();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1]; 

        const specifier = new String("test-specifier");
        const curveLinear = curveTypes["Linier"];
        const curveExponential = curveTypes["Exponential"];
        const curveLogarithmic = curveTypes["Logarithmic"];
        const start = 1;
        const mul = 2;

       
        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await zapBondage.calcZap.call(accounts[5], specifier.valueOf(), 27);
        console.log("calc zap numZap: ", res1[0].valueOf());
        console.log("calc zap numDots: ", res1[1].valueOf());
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        ethDots.should.be.equal(5);
        ethZap.should.be.equal(2);
    });
});