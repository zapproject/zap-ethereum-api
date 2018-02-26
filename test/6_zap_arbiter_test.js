const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

import EVMRevert from './helpers/EVMRevert';


const ZapRegistry = artifacts.require("ZapRegistry");
const ZapToken = artifacts.require("ZapToken");
const ZapBondage = artifacts.require("TestZapBondage");
const ZapDispatch = artifacts.require("ZapDispatch");
const ZapArbiter = artifacts.require("TestZapArbiter"); 
const ProxyDispatcher = artifacts.require("ProxyDispatcher");
const ProxyDispatcherStorage = artifacts.require("ProxyDispatcherStorage");
const FunctionsLib = artifacts.require("FunctionsLib");

var replaceAddr = '1111222233334444555566667777888899990000';

const deployZapToken = () => {
    return ZapToken.new();
};

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

const deployLib = () => {
    return FunctionsLib.new();
}

const deployTestLib = () => {
    return TestLib.new();
}

const deployDispatcherStorage = (libAddr) => {
    return ProxyDispatcherStorage.new(libAddr)
}

const deployDispatcher = (dispatcherStorage) => {
    ProxyDispatcher.unlinked_binary = ProxyDispatcher.unlinked_binary.replace(replaceAddr, dispatcherStorage.address.slice(2));
    replaceAddr = dispatcherStorage.address.slice(2);
    return ProxyDispatcher.new()
}


const CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponential": 2,
    "Logarithmic": 3
};


contract('ZapArbiter', function (accounts) {
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

    const param1 = new String("p1");
    const param2 = new String("p2");
    const params = [param1.valueOf(), param2.valueOf()];

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    beforeEach(async function deployContracts() {
        this.currentTest.functionsLib = await deployLib();
        this.currentTest.storage = await deployDispatcherStorage(this.currentTest.functionsLib.address);
        this.currentTest.dispatcher = await deployDispatcher(this.currentTest.storage);
        this.currentTest.zapRegistry = await deployZapRegistry(this.currentTest.dispatcher.address);
        this.currentTest.zapToken = await deployZapToken();
        this.currentTest.zapBondage = await deployZapBondage(this.currentTest.zapToken.address, this.currentTest.zapRegistry.address, this.currentTest.dispatcher.address);
        this.currentTest.zapArbiter = await deployZapArbiter(this.currentTest.zapBondage.address, this.currentTest.zapRegistry.address);
    });

    it("ZAP_ARBITER_1 - initiateSubscription() - Check subscription", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: provider});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await this.test.zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        const res = await this.test.zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);
    });

    it("ZAP_ARBITER_2 - initiateSubscription() - Check subscription block must be more than 0", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: provider});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        expect(this.test.zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 0)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_3 - initiateSubscription() - Check user can inititate subscription for same provider once", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: provider});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await this.test.zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        const res = await this.test.zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        expect(this.test.zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 5)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_4 - endZapSubscription() - Check ending subscription", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: provider});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await this.test.zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        let res = await this.test.zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await this.test.zapArbiter.endZapSubscription(specifier.valueOf(), provider, owner);

        res = await this.test.zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    it("ZAP_ARBITER_5 - endZapSubscription() - Check that user can't end uninitialized subscription", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: oracle });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.approve(this.test.zapBondage.address, approveTokens, {from: provider});

        await this.test.zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        //await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        expect(this.test.zapArbiter.endZapSubscription(specifier.valueOf(), provider, owner)).to.eventually.be.rejectedWith(EVMRevert);
    });
});