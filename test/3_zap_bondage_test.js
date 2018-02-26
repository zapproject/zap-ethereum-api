const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');

const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("TestZapBondage");
const ZapDispatch = artifacts.require("ZapDispatch");
const ZapArbiter = artifacts.require("ZapArbiter"); 
const ProxyDispatcher = artifacts.require("ProxyDispatcher");
const ProxyDispatcherStorage = artifacts.require("ProxyDispatcherStorage");
const FunctionsLib = artifacts.require("FunctionsLib");

import EVMRevert from './helpers/EVMRevert';

var replaceAddr = '1111222233334444555566667777888899990000';

const deployZapToken = () => {
    return ZapToken.new();
};

const deployLib = () => {
    return FunctionsLib.new();
}

const deployDispatcherStorage = (libAddr) => {
    return ProxyDispatcherStorage.new(libAddr)
}

const deployDispatcher = (dispatcherStorage) => {
    ProxyDispatcher.unlinked_binary = ProxyDispatcher.unlinked_binary.replace(replaceAddr, dispatcherStorage.address.slice(2));
    replaceAddr = dispatcherStorage.address.slice(2);
    return ProxyDispatcher.new()
}

const deployZapRegistry = (dispatcherAddress) => {
    ZapRegistry.link('LibInterface', dispatcherAddress);
    return ZapRegistry.new();
};

const deployZapBondage = (tokenAddress, registryAddress, dispatcherAddress) => {
    ZapBondage.link('LibInterface', dispatcherAddress);
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

const deployFunctions = (registryAddress) => {
    return Functions.new(registryAddress);
};


contract('ZapBondage', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = new String("test-specifier");
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    beforeEach(async function deployContracts() {
        this.currentTest.zapToken = await deployZapToken();
        this.currentTest.lib = await deployLib();
        this.currentTest.storage = await deployDispatcherStorage(this.currentTest.lib.address);
        this.currentTest.dispatcher = await deployDispatcher(this.currentTest.storage);
        this.currentTest.zapRegistry = await deployZapRegistry(this.currentTest.dispatcher.address);
        this.currentTest.zapBondage = await deployZapBondage(this.currentTest.zapToken.address, this.currentTest.zapRegistry.address, this.currentTest.dispatcher.address);
        this.currentTest.zapDisaptch = await deployZapDispatch();
        this.currentTest.zapArbiter = await deployZapArbiter(this.currentTest.zapBondage.address, this.currentTest.zapRegistry.address);
    });


    it("ZAP_BONDAGE_1 - bond() - Check bond function", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        await this.test.zapBondage.bond(specifier.valueOf(), 100, oracle, {from: subscriber});
    });

    it("ZAP_BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        expect(this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: subscriber})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        expect(this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_4 - unbond() - Check unbond function", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: subscriber});

        await this.test.zapBondage.unbond(specifier.valueOf(), 500, oracle, {from: subscriber});
    });

    it("ZAP_BONDAGE_5 - calcZapForDots() - Check zap for dots calculatnig", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[5] });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        const jsLinearZap = Utils.calculateZapWithLinearCurve(5, start, mul);
        const res1 = await this.test.zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5]);
        const ethLinearZap = parseInt(res1.valueOf());

        expect(jsLinearZap).to.be.equal(ethLinearZap);


        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[6] });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveExponential, start, mul, { from: accounts[6] });
        const jsExponentialZap = Utils.calculateZapWithExponentialCurve(5, start, mul);
        const res2 = await this.test.zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[6]);
        const ethExponentialZap = parseInt(res2.valueOf());

        expect(jsExponentialZap).to.be.equal(ethExponentialZap);


        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[7] });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLogarithmic, start, mul, { from: accounts[7] });
        const jsLogarithmicZap = Utils.calculateZapWithLogarithmicCurve(5, start, mul);
        const res3 = await this.test.zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[7]);
        const ethLogarithmicZap = parseInt(res3.valueOf());

        expect(jsLogarithmicZap).to.be.equal(ethLogarithmicZap);
    });

    it("ZAP_BONDAGE_6 - calcZapForDots() - Check that function throw error if curve not intialized", async function () {
        expect(this.test.zapBondage.calcZapForDots.call(specifier.valueOf(), 5, accounts[5])).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_7 - calcZap() - Check calcZap function", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        const res1 = await this.test.zapBondage.calcZap.call(oracle, specifier.valueOf(), 25, { from: subscriber });
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        expect(ethDots).to.be.equal(5);
        expect(ethZap).to.be.equal(25);
    });

    it("ZAP_BONDAGE_8 - calcZap() - Check calcZap function throw error if curve not initoalized", async function () {
        expect(this.test.zapBondage.calcZap.call(oracle, specifier.valueOf(), 25)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_BONDAGE_9 - calcZap() - Check calcZap function return 0 dots if numZap is 0", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await this.test.zapBondage.calcZap.call(oracle, specifier.valueOf(), 0);
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        expect(ethDots).to.be.equal(0);
        expect(ethZap).to.be.equal(0);
    });

    it("ZAP_BONDAGE_10 - calcZap() - Check calcZap function return maximum dots and maximum zap if numZap is more than 100 dots cost", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle});

        const jsLinearZap = Utils.calculateZapWithLinearCurve(101, start, mul);
        const jsLinearZapWillUsed = Utils.calculateZapWithLinearCurve(100, start, mul);

        // TODO: it will not perfomed right way if numZap is 25, should be investigated
        const res1 = await this.test.zapBondage.calcZap.call(oracle, specifier.valueOf(), jsLinearZap);
        const ethZap = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        expect(ethDots).to.be.equal(100);
        expect(ethZap).to.be.equal(jsLinearZapWillUsed);
    }); 

    it("ZAP_BONDAGE_11 - getDots() - Check received dots getting", async function () {      
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.zapBondage.bond(specifier.valueOf(), 25, oracle, {from: subscriber});

        const res = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle);
        const receivedDots = parseInt(res.valueOf());

        expect(receivedDots).to.be.equal(5);
    });

    it("ZAP_BONDAGE_12 - getDots() - Check that number of dots of unbonded provider is 0", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        const res = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        expect(receivedDots).to.be.equal(0);
    });

    it("ZAP_BONDAGE_13 - setArbiterAddress() - Check that market address was set", async function () {
        await this.test.zapBondage.setArbiterAddress(this.test.zapArbiter.address, { from: owner });

        const res = await this.test.zapBondage.arbiterAddress.call();
        expect(res.valueOf()).to.be.not.equal(zeroAddress);
    });

    it("ZAP_BONDAGE_14 - setArbiterAddress() - Check that market address can't be reset", async function () {
        await this.test.zapBondage.setArbiterAddress(this.test.zapArbiter.address, { from: owner });
        const res1 = await this.test.zapBondage.arbiterAddress.call();

        await this.test.zapBondage.setArbiterAddress(accounts[9], { from: owner });
        const res2 = await this.test.zapBondage.arbiterAddress.call();

        expect(res1.valueOf()).to.be.equal(res2.valueOf());
    })

    it("ZAP_BONDAGE_15 - setDispatchAddress() - Check that dispatch address was set", async function () {
        await this.test.zapBondage.setDispatchAddress(this.test.zapDisaptch.address, { from: owner });

        const res = await this.test.zapBondage.dispatchAddress.call();
        expect(res.valueOf()).to.be.not.equal(zeroAddress);
    });

    it("ZAP_BONDAGE_16 - setDispatchAddress() - Check that dispatch address can't be reset", async function () {
        await this.test.zapBondage.setDispatchAddress(this.test.zapDisaptch.address, { from: owner });
        const res1 = await this.test.zapBondage.dispatchAddress.call();

        await this.test.zapBondage.setDispatchAddress(accounts[9], { from: owner });
        const res2 = await this.test.zapBondage.dispatchAddress.call();

        expect(res1.valueOf()).to.be.equal(res2.valueOf());
    });

    it("ZAP_BONDAGE_17 - getZapBound() - Check received zap getting", async function () {      
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.zapBondage.bond(specifier.valueOf(), 26, oracle, {from: subscriber});

        const res = await this.test.zapBondage.getZapBound.call(oracle, specifier.valueOf(), { from: subscriber });
        const receivedZap = parseInt(res.valueOf());

        expect(receivedZap).to.be.equal(25);
    });

    it("ZAP_BONDAGE_18 - getZapBound() - Check that received zap of unbonded provider is 0", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        const res = await this.test.zapBondage.getZapBound.call(oracle, specifier.valueOf(), { from: subscriber });
        const receivedZap = parseInt(res.valueOf());

        expect(receivedZap).to.be.equal(0);
    });

    it("ZAP_BONDAGE_19 - escrowDots() - Check that operator can escrow dots", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 25, oracle, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        await this.test.zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.zapBondage.escrowDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.zapBondage.pendingEscrow.call(subscriber, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        expect(escrowDots).to.be.equal(dotsForEscrow);
    });

    it("ZAP_BONDAGE_20 - escrowDots() - Check that not operator can't escrow dots", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 25, oracle, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

       // await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.zapBondage.escrowDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.zapBondage.pendingEscrow.call(subscriber, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        expect(oracleDots).to.be.equal(dots);
        expect(escrowDots).to.be.equal(0);
    });

    it("ZAP_BONDAGE_21 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {     
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 0, oracle, {from: subscriber});

        const dots = 0;
        const dotsForEscrow = 2;

       // await zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.zapBondage.escrowDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });
        
        const oracleDotsRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.zapBondage.pendingEscrow.call(subscriber, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        expect(oracleDots).to.be.equal(0);
        expect(escrowDots).to.be.equal(0);
    });

    it("ZAP_BONDAGE_22 - releaseDots() - Check that operator can release dots", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 25, oracle, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.zapBondage.escrowDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });
        await this.test.zapBondage.releaseDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });

        const oracleDotsRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle);
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const pendingDotsRes = await this.test.zapBondage.pendingEscrow.call(subscriber, oracle, specifier.valueOf());
        const pendingDots = parseInt(pendingDotsRes.valueOf());

        const releaseRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), oracle, oracle, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        expect(pendingDots).to.be.equal(0);
        expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("ZAP_BONDAGE_23 - releaseDots() - Check that operator can release dots if trying to release more dots than escrowed", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 25, oracle, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.zapBondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.zapBondage.escrowDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow, { from: accounts[3] });
        await this.test.zapBondage.releaseDots(specifier.valueOf(), subscriber, oracle, dotsForEscrow + 2, { from: accounts[3] });

        const oracleDotsRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), subscriber, oracle, { from: subscriber });
        const oracleDots = parseInt(oracleDotsRes.valueOf());

        const escrowDotsRes = await this.test.zapBondage.pendingEscrow.call(subscriber, oracle, specifier.valueOf());
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await this.test.zapBondage.getDots.call(specifier.valueOf(), oracle, oracle, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());


        expect(oracleDots).to.be.equal(dots - dotsForEscrow);
        expect(escrowDots).to.be.equal(dotsForEscrow);
        expect(releaseDots).to.be.equal(0);
    });

    it("ZAP_BONDAGE_23 - getDotsIssued() - Check that issued dots will increase with every bond", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 26, oracle, {from: subscriber});
        await this.test.zapBondage.bond(specifier.valueOf(), 14, oracle, {from: subscriber});

        const issuedDots = await this.test.zapBondage.getDotsIssued.call(specifier.valueOf(), oracle, {from: subscriber});
        expect(parseInt(issuedDots.valueOf())).to.be.equal(6);
    });

    it("ZAP_BONDAGE_24 - getDotsIssued() - Check that issued dots will decrease with every unbond", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(subscriber, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.zapBondage.bond(specifier.valueOf(), 26, oracle, {from: subscriber});
        await this.test.zapBondage.bond(specifier.valueOf(), 14, oracle, {from: subscriber});

        await this.test.zapBondage.unbond(specifier.valueOf(), 1, oracle, {from: subscriber});

        const issuedDots = await this.test.zapBondage.getDotsIssued.call(specifier.valueOf(), oracle, {from: subscriber});
        expect(parseInt(issuedDots.valueOf())).to.be.equal(5);
    });
});