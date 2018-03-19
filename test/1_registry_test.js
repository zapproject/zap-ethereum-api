//import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");

const Utils = require("./helpers/utils.js");

function hex2a(hexx) { 
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 2; i < hex.length; i += 2) {
        let hexValue = hex.substr(i, 2);
        if (hexValue != "00")
            str += String.fromCharCode(parseInt(hexValue, 16));
    }
    return str;
}

contract('Registry', async (accounts) => {
    const owner = accounts[0];
    const publicKey = 111;
    const title = "test";
    const specifier = "test-linear-specifier";
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveNone = Utils.CurveTypes["None"];
    const start = 1;
    const mul = 2;
    const params = ["param1", "param2"];

    beforeEach(async function deployContracts() {
        this.currentTest.stor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.stor.address);
        this.currentTest.stor.transferOwnership(this.currentTest.registry.address);
    });

    it("REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, {from: owner });
    });

    it("REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {        
        const newPublicKey = 222;
        const newTitle = "test-test"

        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProvider(newPublicKey, newTitle, specifier, params, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);
        const receivedPublickKey = await this.test.registry.getProviderPublicKey.call(owner);
        expect(receivedTitle).to.be.equal(title);
        expect(receivedPublickKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: owner });
    });
/*
    it("REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't initiated", async function () {
        expect(this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_5 - initiateProviderCurve() - Check that we can't initiate provider curve if curve type is none", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        expect(this.test.registry.initiateProviderCurve(specifier, curveNone, start, mul, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });
*/
    it("REGISTRY_6 - getProviderRouteKeys() - Check that we can get provider route keys", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedRouteKeys = await this.test.registry.getProviderRouteKeys.call(owner, specifier);
        expect(Utils.fetchPureArray(receivedRouteKeys, hex2a)).to.have.deep.members(params);
    });

    it("REGISTRY_7 - getProviderRouteKeys() - Check that route keys of uninitialized provider are empty", async function () {        
        const res = await this.test.registry.getProviderRouteKeys.call(owner, specifier);
        
        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);

        expect(receivedTitle.valueOf()).to.be.equal(title);
    });

    it("REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        expect(this.test.registry.getProviderTitle.call(owner)).to.eventually.be.equal('');
    });

    it("REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedPublicKey = await this.test.registry.getProviderPublicKey.call(owner);

        expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.registry.getProviderPublicKey.call(owner);
       
        expect(res.valueOf()).to.be.equal('0');
    });

    it("REGISTRY_12 - getProviderCurve() - Check that we can get provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: owner });

        const res = await this.test.registry.getProviderCurve.call(owner, specifier, { from: owner });
        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(curveLinear);
        expect(arr[1].valueOf()).to.be.an('number').equal(start);
        expect(arr[2].valueOf()).to.be.an('number').equal(mul);
    });

    it("REGISTRY_13 - getProviderCurve() - Check that uninitialized provider curve is empty", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const res = await this.test.registry.getProviderCurve.call(owner, specifier, { from: owner });

        const arr = Utils.fetchPureArray(res, parseInt);

        expect(arr[0].valueOf()).to.be.an('number').equal(0);
        expect(arr[1].valueOf()).to.be.an('number').equal(0);
        expect(arr[2].valueOf()).to.be.an('number').equal(0);
    });

    it("REGISTRY_14 - setEndpointParams() - Check that we can set endpoint params", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const newParams = ["p", "a", "r", "a", "m", "s"];

        await this.test.registry.setEndpointParams(specifier, newParams, { from: owner });

        const res = await this.test.registry.getProviderRouteKeys.call(owner, specifier);

        expect(Utils.fetchPureArray(res, hex2a)).to.have.deep.members(newParams);
    });

    it("REGISTRY_15 - getNextProvider() - Check that we can iterate through providers", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await this.test.registry.initiateProvider(publicKey + 1, title + "1", specifier + "1", params, { from: accounts[1] });

        await this.test.registry.initiateProvider(publicKey + 2, title + "2", specifier + "2", params, { from: accounts[2] });

        let index = 0;
        let res = await this.test.registry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title);
        index = parseInt(res[0].valueOf());
        
        res = await this.test.registry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "1");
        index = parseInt(res[0].valueOf());

        res = await this.test.registry.getNextProvider(index);
        expect(res[3].valueOf()).to.be.equal(title + "2");
        index = parseInt(res[0].valueOf());
        
        expect(index).to.be.equal(0);
    }); 
});
