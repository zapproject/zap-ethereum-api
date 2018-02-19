const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const ZapRegistry = artifacts.require("ZapRegistry");
const Functions = artifacts.require("Functions"); 

import EVMRevert from './helpers/EVMRevert';

const Utils = require("./helpers/Utils.js");

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const deployFunctions = (registryAddress) => {
    return Functions.new(registryAddress);
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

    it("ZAP_REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });
    });

    it("ZAP_REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);
        
        const newPublicKey = 222;
        const newTitle = "test-test"

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        await zapRegistry.initiateProvider(newPublicKey, newTitle, specifier.valueOf(), params, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);
        const receivedPublickKey = await zapRegistry.getProviderPublicKey.call(owner);
        expect(receivedTitle).to.be.equal(title);
        expect(receivedPublickKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner });
    });

    it("ZAP_REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't intiated", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        expect(zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_5 - initiateProviderCurve() - Check that we can't initiate provider curve if curve type is none", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        expect(zapRegistry.initiateProviderCurve(specifier.valueOf(), curveNone, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_REGISTRY_6 - getProviderRouteKeys() - Check that we can get provider route keys", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const receivedRouteKeys = await zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());

        expect(Utils.fetchPureArray(receivedRouteKeys, hex2a)).to.have.deep.members(params);
    });

    it("ZAP_REGISTRY_7 - getProviderRouteKeys() - Check that route keys of uninitialized provider are empty", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        const res = await zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());
        
        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("ZAP_REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);

        expect(receivedTitle.valueOf()).to.be.equal(title);
    });

    it("ZAP_REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);
        
        expect(zapRegistry.getProviderTitle.call(owner)).to.eventually.be.equal('');
    });

    it("ZAP_REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const receivedPublicKey = await zapRegistry.getProviderPublicKey.call(owner);

        expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("ZAP_REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        const res = await zapRegistry.getProviderPublicKey.call(owner);
       
        expect(res.valueOf()).to.be.equal('0');
    });

    it("ZAP_REGISTRY_12 - getProviderCurve() - Check that we can get provider curve", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: owner });

        const res = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });

        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(curveLinear);
        expect(arr[1].valueOf()).to.be.an('number').equal(start);
        expect(arr[2].valueOf()).to.be.an('number').equal(mul);
    });

    it("ZAP_REGISTRY_13 - getProviderCurve() - Check that uninitialized provider curve is empty", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const res = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf(), { from: owner });

        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(0);
        expect(arr[1].valueOf()).to.be.an('number').equal(0);
        expect(arr[2].valueOf()).to.be.an('number').equal(0);
    });

    it("ZAP_REGISTRY_14 - setEndpointParams() - Check that we can set endpoint params", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        const newParams = ["p", "a", "r", "a", "m", "s"];

        await zapRegistry.setEndpointParams(specifier.valueOf(), newParams, { from: owner });

        const res = await zapRegistry.getProviderRouteKeys.call(owner, specifier.valueOf());

        expect(Utils.fetchPureArray(res, hex2a)).to.have.deep.members(newParams);
    });

    it("ZAP_REGISTRY_15 - getNextProvider() - Check that we can iterate through providers", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        await zapRegistry.setFunctionsAddress(functions.address);

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: owner });

        await zapRegistry.initiateProvider(publicKey + 1, title + "1", specifier.valueOf() + "1", params, { from: accounts[1] });

        await zapRegistry.initiateProvider(publicKey + 2, title + "2", specifier.valueOf() + "2", params, { from: accounts[2] });

        let index = 0;
        let res = await zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title);
        index = parseInt(res[0].valueOf());
        
        res = await zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "1");
        index = parseInt(res[0].valueOf());

        res = await zapRegistry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "2");
        index = parseInt(res[0].valueOf());
        
        expect(index).to.be.equal(0);
    });
});