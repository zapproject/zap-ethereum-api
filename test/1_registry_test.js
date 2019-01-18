import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;
const web3utils = require("web3-utils");

const expect = require('chai')
    .use(require('chai-as-promised'))
    .expect;

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
    const publicKey = 111;
    const title = "test";
    const specifier = "test-linear-specifier";
    const params = ["param1", "param2"];
    const emptyBroker = 0;
    // y = 2x + x^2 from [1, 100]
    const curve = [3, 0, 2, 1, 100];

    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.coord = await ZapCoordinator.new();
        const owner = await this.currentTest.coord.owner();
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
        await this.test.registry.initiateProvider(publicKey, title, {from: owner });
    });

    it("REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {
        const newPublicKey = 222;
        const newTitle = "test-test";

        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await expect(this.test.registry.initiateProvider(newPublicKey, newTitle, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });
    });

    it("REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't initiated", async function () {
        await expect(this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        await expect(this.test.registry.initiateProviderCurve(specifier, [3, 0, 0, 0, 5, 100], emptyBroker, { from: owner }))
            .to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_6 - get/setEndpointParams() - Check that we can get and set provider endpoint parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        const p = ["Hello", "World"].map(x=>web3utils.padLeft(web3utils.asciiToHex(x), 64));
        await this.test.registry.setEndpointParams(specifier, p);
        const params = await this.test.registry.getEndpointParams(owner, specifier);
        expect(params[1]).to.be.equal(p[1]);
    });

    it("REGISTRY_7 - get/setProviderParameter() - Check that we can get and set provider parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        const val_a = web3utils.padLeft(web3utils.asciiToHex("World"), 64);
        const val_b = web3utils.padLeft(web3utils.asciiToHex("Orange"), 64);
        await this.test.registry.setProviderParameter("Hello", val_a, {from: owner});
        await this.test.registry.setProviderParameter("Apple", val_b, {from: owner});

        const a = await this.test.registry.getProviderParameter(owner, "Hello");
        const b = await this.test.registry.getProviderParameter(owner, "Apple");
        expect(a).to.be.equal(val_a);
        expect(b).to.be.equal(val_b);
    });

    it("REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);
        await expect(hex2a(receivedTitle.valueOf())).to.be.equal(title);
    });

    it("REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);

        await expect(hex2a(receivedTitle.valueOf())).to.be.equal('');
    });

    it("REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        const receivedPublicKey = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(res.valueOf()).to.be.equal('0');
    });

    it("REGISTRY_12 - getProviderCurve() - Check that we initialize and get provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, {from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });
        const x = await this.test.registry.getProviderCurve(owner, specifier);

        const raw = Utils.fetchPureArray(x, parseInt);
        expect(raw).to.be.an('array');
        expect(raw.length).to.be.greaterThan(0);

        const args = await this.test.registry.getProviderCurveLength(owner,specifier);
        expect(raw.length).to.be.equal(+args.valueOf());
    });

    it("REGISTRY_13 - getProviderCurve() - Check that cant get uninitialized curve ", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        await expect(this.test.registry.getProviderCurve.call(owner, specifier, { from: owner })).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("REGISTRY_14 - setProviderParameter()/setEndpointParams() - Check that a non-owner cannot edit provider & endpoint parameters", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        await expect(this.test.registry.setProviderParameter("A", "B", { from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
        await expect(this.test.registry.setEndpointParams(specifier, ["A", "B"], { from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("REGISTRY_15 - getNextProvider() - Check that we can get all providers", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProvider(publicKey + 1, title + "1", { from: accounts[1] });
        await this.test.registry.initiateProvider(publicKey + 2, title + "2", { from: accounts[2] });

        const providers = await this.test.registry.getAllOracles();

        await expect(providers[0]).to.be.equal(owner);
        await expect(providers[1]).to.be.equal(accounts[1]);
        await expect(providers[2]).to.be.equal(accounts[2]);
    });

    it("REGISTRY_16 - getEndpointBroker() - Check that broker address can be saved and retreived", async function () {

        let testBroker = owner;
        await this.test.registry.initiateProvider(publicKey, title, {from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, testBroker, { from: owner });
        const savedBroker = await this.test.registry.getEndpointBroker(owner, specifier);
        console.log('broker: ', savedBroker);
        expect(savedBroker).to.be.equal(testBroker);
    });

    it("REGISTRY_17 -clearEndpoint() - Check that provider can clear endpoint with no bonds", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, emptyBroker, { from: owner });

        let endpoints0 = await this.test.registry.getProviderEndpoints(owner, {from:owner});

        await this.test.registry.clearEndpoint(specifier, {from: owner});

        let endpoints1 = await this.test.registry.getProviderEndpoints(owner, {from:owner});
        expect(endpoints0[0] != endpoints1[0]);
    });

    it("REGISTRY_18 -setProviderTitle() - Check that provider can change their title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: owner });

        let title0 = await this.test.registry.getProviderTitle(owner, {from: owner});

        await this.test.registry.setProviderTitle('testRandom2341143', {from: owner});

        let title1 = await this.test.registry.getProviderTitle(owner, {from: owner});

        console.log(title0, title1);
    });
});
