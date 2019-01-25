import EVMRevert from './helpers/EVMRevert';

const web3utils = require("web3-utils");

const should = require('chai')
          .use(require('chai-as-promised'))
          .use(require('chai-bignumber')(web3.BigNumber))
          .should();

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Registry = artifacts.require("Registry");
const CurrentCost = artifacts.require("CurrentCost");

const Utils = require("./helpers/utils.js");

function hex2a(hexx) {
    let hex = hexx.toString(); //force conversion
    let str = '';
    for (let i = 2; i < hex.length; i += 2) {
        let hexValue = hex.substr(i, 2);
        if (hexValue != "00" && hexValue != "0x") {
            str += String.fromCharCode(parseInt(hexValue, 16));
        }
    }
    return str;
}

contract('Registry', async (accounts) => {
    const owner = accounts[0];
    const publicKey = web3.toBigNumber(111);
    const title = "test";
    const specifier = "test-linear-specifier";
    const params = ["param1", "param2"];
    const emptyBroker = 0;
    // y = 2x + x^2 from [1, 100]
    const curve = [3, 0, 2, 1, 100];

    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.coord = await ZapCoordinator.new();
        this.currentTest.db = await Database.new();
        await this.currentTest.db.transferOwnership(this.currentTest.coord.address);
        await this.currentTest.coord.addImmutableContract('DATABASE', this.currentTest.db.address);
        // Deploy registry
        this.currentTest.registry = await Registry.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY', this.currentTest.registry.address);

        // Deploy current cost
        this.currentTest.currentCost = await CurrentCost.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('CURRENT_COST', this.currentTest.currentCost.address);

        await this.currentTest.coord.updateAllDependencies({ from: owner });
    });

    it("REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner }).should.be.fulfilled;
    });

    it("REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {
        const newPublicKey = web3.toBigNumber(222);
        const newTitle = "test-test";

        await this.test.registry.initiateProvider(publicKey, title, { from: owner }).should.be.fulfilled;
        await this.test.registry.initiateProvider(newPublicKey, newTitle, { from: owner }).should.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner }).should.be.fulfilled;
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner }).should.be.fulfilled;
    });

    it("REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't initiated", async function () {
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner }).should.be.rejectedWith(EVMRevert);

        await this.test.registry.initiateProvider(publicKey, title, { from: owner }).should.be.fulfilled;

        await this.test.registry.initiateProviderCurve(specifier, [3, 0, 0, 0, 5, 100], emptyBroker, { from: owner }).should.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_6 - get/setEndpointParams() - Check that we can get and set provider endpoint parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        const p = ["Hello", "World"].map(x=>web3utils.padLeft(web3utils.asciiToHex(x), 64));
        await this.test.registry.setEndpointParams(specifier, p).should.be.fulfilled;
        const params = await this.test.registry.getEndpointParams(owner, specifier);
        params[1].should.equal(p[1]);
    });

    it("REGISTRY_7 - get/setProviderParameter() - Check that we can get and set provider parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        const val_a = web3utils.padLeft(web3utils.asciiToHex("World"), 64);
        const val_b = web3utils.padLeft(web3utils.asciiToHex("Orange"), 64);
        await this.test.registry.setProviderParameter("Hello", val_a, { from: owner }).should.be.fulfilled;
        await this.test.registry.setProviderParameter("Apple", val_b, { from: owner }).should.be.fulfilled;

        const a = await this.test.registry.getProviderParameter(owner, "Hello");
        const b = await this.test.registry.getProviderParameter(owner, "Apple");
        a.should.equal(val_a);
        b.should.equal(val_b);
    });

    it("REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);
        hex2a(receivedTitle.valueOf()).should.equal(title);
    });

    it("REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);
        hex2a(receivedTitle.valueOf()).should.equal('');
    });

    it("REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        const receivedPublicKey = await this.test.registry.getProviderPublicKey.call(owner);
        receivedPublicKey.should.be.bignumber.equal(publicKey);
    });

    it("REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.registry.getProviderPublicKey.call(owner);
        res.should.be.bignumber.equal(web3.toBigNumber(0));
    });

    it("REGISTRY_12 - getProviderCurve() - Check that we initialize and get provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });
        const x = await this.test.registry.getProviderCurve(owner, specifier);

        const raw = Utils.fetchPureArray(x, parseInt);
        raw.should.be.an('array');
        raw.length.should.be.greaterThan(0);

        const args = await this.test.registry.getProviderCurveLength(owner, specifier);
        raw.length.should.be.bignumber.equal(args);
    });

    it("REGISTRY_13 - getProviderCurve() - Check that cant get uninitialized curve ", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.getProviderCurve.call(owner, specifier, { from: owner }).should.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_14 - setProviderParameter()/setEndpointParams() - Check that a non-owner cannot edit provider & endpoint parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        await this.test.registry.setProviderParameter("A", "B", { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
        await this.test.registry.setEndpointParams(specifier, ["A", "B"], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_15 - getNextProvider() - Check that we can get all providers", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProvider(publicKey + 1, title + "1", { from: accounts[1] });
        await this.test.registry.initiateProvider(publicKey + 2, title + "2", { from: accounts[2] });

        const providers = await this.test.registry.getAllOracles();

        providers[0].should.equal(owner);
        providers[1].should.equal(accounts[1]);
        providers[2].should.equal(accounts[2]);
    });

    it("REGISTRY_16 - getEndpointBroker() - Check that broker address can be saved and retreived", async function () {

        let testBroker = owner;
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, testBroker, { from: owner });
        const savedBroker = await this.test.registry.getEndpointBroker(owner, specifier);
        console.log('broker: ', savedBroker);
        savedBroker.should.equal(testBroker);
    });

    it("REGISTRY_17 - clearEndpoint() - Check that provider can clear endpoint with no bonds", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        let endpoints0 = await this.test.registry.getProviderEndpoints(owner, { from: owner });

        await this.test.registry.clearEndpoint(specifier, { from: owner });

        let endpoints1 = await this.test.registry.getProviderEndpoints(owner, { from: owner });
        endpoints0[0].should.not.equal(endpoints1[0]);
    });

    it("REGISTRY_18 - setProviderTitle() - Check that provider can change their title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        let title0 = await this.test.registry.getProviderTitle(owner, { from: owner });

        await this.test.registry.setProviderTitle('testRandom2341143', { from: owner });

        let title1 = await this.test.registry.getProviderTitle(owner, { from: owner });

        console.log(title0, title1);
    });
});
