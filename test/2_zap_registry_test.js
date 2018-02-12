const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const ZapRegistry = artifacts.require("ZapRegistry");

import EVMRevert from './helpers/EVMRevert';

const Utils = require(".test/helpers/Utils.js");

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const curveTypes = {
    "None": 0,
    "Linier": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

function fetchPureArray(res, parseFunc) {
    let arr = [];
    for (let key in res) {
        arr.push(parseFunc(res[key].valueOf()));
    }
    return arr;
}

contract('ZapRegistry', function (accounts) {
    const owner = accounts[0];

    it("ZAP_REGISTRY_1 - Check that we can initiate provider", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });
    });

    it("ZAP_REGISTRY_2 - Check that we can't change provider info if it was initated", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        
        const newPublicKey = 222;
        const newTitle = "test-test"

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        await zapRegistry.initiateProvider(newPublicKey, [1], newTitle, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);
        const receivedPublickKey = await zapRegistry.getProviderPublicKey.call(owner);
        receivedTitle.should.be.equal(title);
        receivedPublickKey.valueOf().should.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_3 - Check that we can initiate provider curve", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner });
    });

    it("ZAP_REGISTRY_4 - Check that we can't initiate provider curve if provider wasn't intiated", async function () {
        let zapRegistry = await deployZapRegistry();

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

       zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_5 - Check that we can't initiate provider curve if curve type is none", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["None"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_6 - Check that we can get provider route keys", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1, 2, 3];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedRouteKeys = await zapRegistry.getProviderRouteKeys.call(owner);

        fetchPureArray(receivedRouteKeys, parseInt).should.have.deep.members(routeKeys);
    });

    it("ZAP_REGISTRY_7 - Check that route keys of uninitialized provider are empty", async function () {
        let zapRegistry = await deployZapRegistry();

        const res = await zapRegistry.getProviderRouteKeys.call(owner);
        
        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("ZAP_REGISTRY_8 - Check that we can get provider title", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);

        receivedTitle.valueOf().should.be.equal(title);
    });

    it("ZAP_REGISTRY_9 - Check that title of uninitialized provider is empty", async function () {
        let zapRegistry = await deployZapRegistry();
        
        zapRegistry.getProviderTitle.call(owner).should.eventually.be.equal('');
    });

    it("ZAP_REGISTRY_10 - Check that we can get provider public key", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedPublicKey = await zapRegistry.getProviderPublicKey.call(owner);

        receivedPublicKey.valueOf().should.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_11 - Check that public key of uninitialized provider is equal to 0", async function () {
        let zapRegistry = await deployZapRegistry();

        const res = await zapRegistry.getProviderPublicKey.call(owner);
       
        res.valueOf().should.be.equal('0');
    });

    it("ZAP_REGISTRY_12 - Check that we can get provider curve", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner });

        const res = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });

        const arr = fetchPureArray(res, parseInt);

        arr[0].valueOf().should.be.an('number').equal(curve);
        arr[1].valueOf().should.be.an('number').equal(start);
        arr[2].valueOf().should.be.an('number').equal(mul);
    });

    it("ZAP_REGISTRY_13 - Check that uninitialized provider curve is empty", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const res = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });

        const arr = fetchPureArray(res, parseInt);

        arr[0].valueOf().should.be.an('number').equal(0);
        arr[1].valueOf().should.be.an('number').equal(0);
        arr[2].valueOf().should.be.an('number').equal(0);
    });
});