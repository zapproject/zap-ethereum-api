const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Utils = require('./helpers/utils.js');

const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("TestZapBondage");
const ZapDispatch = artifacts.require("ZapDispatch");
const ZapArbiter = artifacts.require("ZapArbiter"); 

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
    const curveLinear = Utils.CurveTypes["Linier"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");


    it("ZAP_BONDAGE_1 - bond() - Check bond function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        const res = await zapBondage.bond(specifier.valueOf(), 100, oracle, {from: provider});
    });

    it("ZAP_BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        //await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: provider });
        //await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });


        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        //await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: provider });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider}).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_4 - unbond() - Check unbond function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });


        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapBondage.unbond(specifier.valueOf(), 500, oracle, {from: provider});
    });

    it("ZAP_BONDAGE_5 - calcZapForDots() - Check zap for dots calculatnig", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        const jsLinearZap = Utils.calculateZapWithLinearCurve(5, start, mul);
        const res1 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5]);
        const ethLinearZap = parseInt(res1.valueOf());

        jsLinearZap.should.be.equal(ethLinearZap);


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[6] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveExponential, start, mul, { from: accounts[6] });
        const jsExponentialZap = Utils.calculateZapWithExponentialCurve(5, start, mul);
        const res2 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[6]);
        const ethExponentialZap = parseInt(res2.valueOf());

        jsExponentialZap.should.be.equal(ethExponentialZap);


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[7] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLogarithmic, start, mul, { from: accounts[7] });
        const jsLogarithmicZap = Utils.calculateZapWithLogarithmicCurve(5, start, mul);
        const res3 = await zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[7]);
        const ethLogarithmicZap = parseInt(res3.valueOf());

        jsLogarithmicZap.should.be.equal(ethLogarithmicZap);
    });

    it("ZAP_BONDAGE_6 - calcZapForDots() - Check that function throw error if curve not intialized", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        // await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        // await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5]).should.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_7 - calcZap() - Check calcZap function", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await zapBondage.calcZap.call(oracle, specifier.valueOf(), 26, { from: provider });
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        ethDots.should.be.equal(5);
        ethZap.should.be.equal(25);
    });

    it("ZAP_BONDAGE_8 - calcZap() - Check calcZap function throw error if curve not initoalized", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);


        // await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        // await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        zapBondage.calcZap.call(oracle, specifier.valueOf(), 26).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_9 - calcZap() - Check calcZap function return 0 dots if numZap is 0", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await zapBondage.calcZap.call(oracle, specifier.valueOf(), 0);
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        ethDots.should.be.equal(0);
        ethZap.should.be.equal(0);
    });

    it("ZAP_BONDAGE_10 - calcZap() - Check calcZap function return maximum dots and maximum zap if numZap is more than 100 dots cost", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle});

        const jsLinearZap = Utils.calculateZapWithLinearCurve(101, start, mul);
        const jsLinearZapWillUsed = Utils.calculateZapWithLinearCurve(100, start, mul);

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await zapBondage.calcZap.call(oracle, specifier.valueOf(), jsLinearZap);
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        ethDots.should.be.equal(100);
        ethZap.should.be.equal(jsLinearZapWillUsed);
    });

    it("ZAP_BONDAGE_11 - currentCostOfDot() - Check current dot cost calculations", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        const dotNumber = 99;


        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[5] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[6] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveExponential, start, mul, { from: accounts[6] });

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: accounts[7] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLogarithmic, start, mul, { from: accounts[7] });


        const linearDotCost = mul * dotNumber + start
        const expDotCost = mul * Math.pow(dotNumber, 2) + start;
        const logDotCost = Math.ceil(mul * Math.log2(dotNumber) + start);

        const res1 = await zapBondage.currentCostOfDot.call(accounts[5], specifier.valueOf(), dotNumber);
        const ethLinearRes = parseInt(res1.valueOf());

        const res2 = await zapBondage.currentCostOfDot.call(accounts[6], specifier.valueOf(), dotNumber);
        const ethExpRes = parseInt(res2.valueOf());

        const res3 = await zapBondage.currentCostOfDot.call(accounts[7], specifier.valueOf(), dotNumber);
        const ethLogrRes = parseInt(res3.valueOf());

        ethLinearRes.should.be.equal(linearDotCost);
        ethExpRes.should.be.equal(expDotCost);
        ethLogrRes.should.be.equal(logDotCost);
    });

    it("ZAP_BONDAGE_12 - getDots() - Check received dots getting", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

      
        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const res = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const receivedDots = parseInt(res.valueOf());

        receivedDots.should.be.equal(5);
    });

    it("ZAP_BONDAGE_13 - getDots() - Check that number of dots of unbonded provider is 0", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        const res = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const receivedDots = parseInt(res.valueOf());

        receivedDots.should.be.equal(0);
    });

    it("ZAP_BONDAGE_14 - fastlog2() - Check log2 calculations", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        let jsResult = Math.ceil(Math.log2(2));
        let res = await zapBondage.fastlog2.call(2, { from: provider });
        let ethResult = parseInt(res.valueOf());
        jsResult.should.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(4));
        res = await zapBondage.fastlog2.call(4, { from: provider });
        ethResult = parseInt(res.valueOf());
        jsResult.should.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(99));
        res = await zapBondage.fastlog2.call(99, { from: provider });
        ethResult = parseInt(res.valueOf());
        jsResult.should.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(55));
        res = await zapBondage.fastlog2.call(55, { from: provider });
        ethResult = parseInt(res.valueOf());
        jsResult.should.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(100));
        res = await zapBondage.fastlog2.call(100, { from: provider });
        ethResult = parseInt(res.valueOf());
        jsResult.should.be.equal(ethResult);
    });

    it("ZAP_BONDAGE_15 - setMarketAddress() - Check that market address was set", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapBondage.setMarketAddress(zapArbiter.address, { from: owner });

        const res = await zapBondage.marketAddress.call();
        res.valueOf().should.be.not.equal(zeroAddress);
    });

    it("ZAP_BONDAGE_16 - setMarketAddress() - Check that market address can't be reset", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapBondage.setMarketAddress(zapArbiter.address, { from: owner });

        const res1 = await zapBondage.marketAddress.call();

        await zapBondage.setMarketAddress(accounts[9], { from: owner });

        const res2 = await zapBondage.marketAddress.call();

        res1.valueOf().should.be.equal(res2.valueOf());
    })

    it("ZAP_BONDAGE_17 - setDispatchAddress() - Check that dispatch address was set", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapBondage.setDispatchAddress(zapDisaptch.address, { from: owner });

        const res = await zapBondage.dispatchAddress.call();
        res.valueOf().should.be.not.equal(zeroAddress);
    });

    it("ZAP_BONDAGE_18 - setDispatchAddress() - Check that dispatch address can't be reset", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapBondage.setDispatchAddress(zapDisaptch.address, { from: owner });

        const res1 = await zapBondage.dispatchAddress.call();

        await zapBondage.setDispatchAddress(accounts[9], { from: owner });

        const res2 = await zapBondage.dispatchAddress.call();

        res1.valueOf().should.be.equal(res2.valueOf());
    });

    it("ZAP_BONDAGE_19 - getZapBound() - Check received zap getting", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

      
        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const res = await zapBondage.getZapBound.call(oracle, specifier.valueOf(), { from: provider });
        const receivedZap = parseInt(res.valueOf());

        receivedZap.should.be.equal(25);
    });

    it("ZAP_BONDAGE_20 - getZapBound() - Check that received zap of unbonded provider is 0", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        const res = await zapBondage.getZapBound.call(oracle, specifier.valueOf(), { from: provider });
        const receivedZap = parseInt(res.valueOf());

        receivedZap.should.be.equal(0);
    });

    it("ZAP_BONDAGE_21 - escrowDots() - Check that operator can escrow dots", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const dots = 5;
        const dotsForEscrow = 2;

        await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await zapBondage.escrowDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await zapBondage.pendingEscrow.call(provider, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        oracleDots.should.be.equal(dots - dotsForEscrow);
        escrowDots.should.be.equal(dotsForEscrow);
    });

    it("ZAP_BONDAGE_22 - escrowDots() - Check that not operator can't escrow dots", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const dots = 5;
        const dotsForEscrow = 2;

       // await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await zapBondage.escrowDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await zapBondage.pendingEscrow.call(provider, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        oracleDots.should.be.equal(dots);
        escrowDots.should.be.equal(0);
    });

    it("ZAP_BONDAGE_23 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await zapBondage.bond(specifier.valueOf(), 0, oracle, {from: provider});

        const dots = 0;
        const dotsForEscrow = 2;

       // await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await zapBondage.escrowDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await zapBondage.pendingEscrow.call(provider, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        oracleDots.should.be.equal(0);
        escrowDots.should.be.equal(0);
    });

    it("ZAP_BONDAGE_24 - releaseDots() - Check that operator can release dots", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await zapBondage.escrowDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });
        await zapBondage.releaseDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await zapBondage.pendingEscrow.call(provider, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());


        oracleDots.should.be.equal(dots - dotsForEscrow);
        escrowDots.should.be.equal(0);
        releaseDots.should.be.equal(dotsForEscrow);
    });

    it("ZAP_BONDAGE_25 - releaseDots() - Check that operator can release dots if trying to release more dots than escrowed", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapDisaptch = await deployZapDispatch();
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await zapBondage.bond(specifier.valueOf(), 26, oracle, {from: provider});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await zapBondage.escrowDots(specifier.valueOf(), provider, oracle, dotsForEscrow, { from: accounts[3] });
        await zapBondage.releaseDots(specifier.valueOf(), provider, oracle, dotsForEscrow + 2, { from: accounts[3] });

        const oracleDotsRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: provider });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await zapBondage.pendingEscrow.call(provider, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await zapBondage.getDots.call(specifier.valueOf(), oracle, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());


        oracleDots.should.be.equal(dots - dotsForEscrow);
        escrowDots.should.be.equal(dotsForEscrow);
        releaseDots.should.be.equal(0);
    });
});