const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const ZapRegistry = artifacts.require("ZapRegistry");
const ProxyDispatcher = artifacts.require("ProxyDispatcher");
const ProxyDispatcherStorage = artifacts.require("ProxyDispatcherStorage");
const FunctionsLib = artifacts.require("FunctionsLib");

import EVMRevert from './helpers/EVMRevert';

const Utils = require("./helpers/utils.js");

var replaceAddr = '1111222233334444555566667777888899990000';

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

function hex2a(hexx) { 
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 2; i < hex.length; i += 2) {
        let hexValue = hex.substr(i, 2);
        if (hexValue != "00") {
            str += String.fromCharCode(parseInt(hexValue, 16));
        }
    }
    return str;
}

contract('ZapRegistry', function (accounts) {
    const owner = accounts[0];

    const publicKey = 111;
    const title = "test";
    const specifier = new String("test-linear-specifier");
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveNone = Utils.CurveTypes["None"];
    const start = 1;
    const mul = 2;
    const params = ["param1", "param2"];

    beforeEach(async function deployContracts() {
        this.currentTest.lib = await deployLib();
        this.currentTest.storage = await deployDispatcherStorage(this.currentTest.lib.address);
        this.currentTest.dispatcher = await deployDispatcher(this.currentTest.storage);
        this.currentTest.zapRegistry = await deployZapRegistry(this.currentTest.dispatcher.address);
    });

    it("ZAP_REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {     
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
    });

    it("ZAP_REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {        
        const newPublicKey = 222;
        const newTitle = "test-test"

        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        await this.test.zapRegistry.initiateProvider(newPublicKey, newTitle, specifier.valueOf(), params, { from: owner });

        const receivedTitle = await this.test.zapRegistry.getProviderTitle.call(owner);
        const receivedPublickKey = await this.test.zapRegistry.getProviderPublicKey.call(owner);
        expect(receivedTitle).to.be.equal(title);
        expect(receivedPublickKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner });
    });

    it("ZAP_REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't intiated", async function () {
        expect(this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_5 - initiateProviderCurve() - Check that we can't initiate provider curve if curve type is none", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        expect(this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveNone, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_6 - getProviderRouteKeys() - Check that we can get provider route keys", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        const receivedRouteKeys = await this.test.zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());

        expect(Utils.fetchPureArray(receivedRouteKeys, hex2a)).to.have.deep.members(params);
    });

    it("ZAP_REGISTRY_7 - getProviderRouteKeys() - Check that route keys of uninitialized provider are empty", async function () {
        const res = await this.test.zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());
    
        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("ZAP_REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        const receivedTitle = await this.test.zapRegistry.getProviderTitle.call(owner);

        expect(receivedTitle.valueOf()).to.be.equal(title);
    });

    it("ZAP_REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {        
        expect(this.test.zapRegistry.getProviderTitle.call(owner)).to.eventually.be.equal('');
    });

    it("ZAP_REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        const receivedPublicKey = await this.test.zapRegistry.getProviderPublicKey.call(owner);

        expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.zapRegistry.getProviderPublicKey.call(owner);
       
        expect(res.valueOf()).to.be.equal('0');
    });

    it("ZAP_REGISTRY_12 - getProviderCurve() - Check that we can get provider curve", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner });

        const res = await this.test.zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });
        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(curveLinear);
        expect(arr[1].valueOf()).to.be.an('number').equal(start);
        expect(arr[2].valueOf()).to.be.an('number').equal(mul);
    });

    it("ZAP_REGISTRY_13 - getProviderCurve() - Check that uninitialized provider curve is empty", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        const res = await this.test.zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });

        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(0);
        expect(arr[1].valueOf()).to.be.an('number').equal(0);
        expect(arr[2].valueOf()).to.be.an('number').equal(0);
    });

    it("ZAP_REGISTRY_14 - setEndpointParams() - Check that we can set endpoint params", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const newParams = ["p", "a", "r", "a", "m", "s"];

        await this.test.zapRegistry.setEndpointParams(specifier.valueOf(), newParams, { from: owner });

        const res = await this.test.zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());

        expect(Utils.fetchPureArray(res, hex2a)).to.have.deep.members(newParams);
    });

    it("ZAP_REGISTRY_15 - getNextProvider() - Check that we can iterate through providers", async function () {
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
        await this.test.zapRegistry.initiateProvider(publicKey + 1, title + "1", specifier.valueOf() + "1", params, { from: accounts[1] });
        await this.test.zapRegistry.initiateProvider(publicKey + 2, title + "2", specifier.valueOf() + "2", params, { from: accounts[2] });

        let index = 0;
        let res = await this.test.zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title);
        index = parseInt(res[0].valueOf());
        
        res = await this.test.zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "1");
        index = parseInt(res[0].valueOf());

        res = await this.test.zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "2");
        index = parseInt(res[0].valueOf());
        
        expect(index).to.be.equal(0);
    });
});
