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

const CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponential": 2,
    "Logarithmic": 3
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

    const param1 = new String("p1");
    const param2 = new String("p2");
    const params = [param1.valueOf(), param2.valueOf()];

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    it("ZAP_ARBITER_1 - initiateSubscription() - Check subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        const res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);
    });

    it("ZAP_ARBITER_2 - initiateSubscription() - Check subscription block must be more than 0", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        expect(zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 0)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_3 - initiateSubscription() - Check user can inititate subscription for same provider once", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        const res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        expect(zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 5)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_4 - endZapSubscription() - Check ending subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        let res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await zapArbiter.endZapSubscription(specifier.valueOf(), provider, owner);

        res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    it("ZAP_ARBITER_5 - endZapSubscription() - Check that user can't end uninitialized subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        //await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        expect(zapArbiter.endZapSubscription(specifier.valueOf(), provider, owner)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_6 - endZapSubscription_Provider() - Check ending subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        let res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await zapArbiter.endZapSubscription_Provider(specifier.valueOf(), owner, provider);

        res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    
    it("ZAP_ARBITER_7 - endZapSubscription_Provider() - Check that user can't end uninitialized subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        //await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        expect(zapArbiter.endZapSubscription_Provider(specifier.valueOf(), owner, provider)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_ARBITER_8 - endZapSubscription_Subscriber() - Check ending subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        let res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await zapArbiter.endZapSubscription_Subscriber(specifier.valueOf(), owner, provider);

        res = await zapArbiter.subscriptions.call(provider, owner, specifier.valueOf());
        expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    
    it("ZAP_ARBITER_9 - endZapSubscription_Subscriber() - Check that user can't end uninitialized subscription", async function () {
        let zapRegistry = await deployZapRegistry();
        let zapToken = await deployZapToken();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let zapArbiter = await deployZapArbiter(zapBondage.address, zapRegistry.address);

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: oracle });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: oracle });

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        await zapBondage.bond(specifier.valueOf(), 1000, oracle, {from: provider});

        //await zapArbiter.initiateSubscription(provider, params, specifier.valueOf(), publicKey, 10);

        expect(zapArbiter.endZapSubscription_Subscriber(specifier.valueOf(), owner, provider)).to.eventually.be.rejectedWith(EVMRevert);
    });


});