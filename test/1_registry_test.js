import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
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

    // y = 2x + x^2 from [1, 100]
    const curve = [3, 0, 2, 1, 100];

    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.coord = await ZapCoordinator.new();
        const owner = await this.currentTest.coord.owner();
        this.currentTest.db = await Database.new();
        await this.currentTest.coord.setContract('DATABASE', this.currentTest.db.address);

        // Deploy storage
        this.currentTest.stor = await RegistryStorage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY_STORAGE', this.currentTest.stor.address);

        // Deploy registry
        this.currentTest.registry = await Registry.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY', this.currentTest.registry.address);
        
        // Deploy current cost
        this.currentTest.currentCost = await CurrentCost.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('CURRENT_COST', this.currentTest.currentCost.address);

        await this.currentTest.coord.updateAllDependencies({ from: owner });
        await this.currentTest.stor.transferOwnership(this.currentTest.registry.address);
        await this.currentTest.db.setStorageContract(this.currentTest.stor.address, true);
    });

    it("REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, {from: owner });
    });

    it("REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {
        const newPublicKey = 222;
        const newTitle = "test-test";

        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await expect(this.test.registry.initiateProvider(newPublicKey, newTitle, specifier, params, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, { from: owner });
    });

    it("REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't initiated", async function () {
        await expect(this.test.registry.initiateProviderCurve(specifier, curve, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_5 - initiateProviderCurve() - Check that we can't initiate provider curve if passing in invalid curve arguments ", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await expect(this.test.registry.initiateProviderCurve(specifier, [3, 0, 0, 0, 5, 100], { from: owner }))
            .to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_6 - getNextEndpointParam() - Check that we can get provider route keys", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedParam1 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);
        const receivedParam2 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 1);
        await expect(Utils.fetchPureArray([receivedParam1.valueOf(), receivedParam2.valueOf()], hex2a)).to.have.deep.members(params);
    });

    it("REGISTRY_7 - getNextEndpointParam() - Check that route keys of uninitialized provider are empty", async function () {
        const res = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);

        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);
        await expect(hex2a(receivedTitle.valueOf())).to.be.equal(title);
    });

    it("REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);

        await expect(hex2a(receivedTitle.valueOf())).to.be.equal('');
    });

    it("REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedPublicKey = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(res.valueOf()).to.be.equal('0');
    });

    it("REGISTRY_12 - getProviderCurve() - Check that we initialize and get provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, curve, { from: owner });
        const x = await this.test.registry.getProviderCurve.call(owner, specifier);
        
        const raw = Utils.fetchPureArray(x, parseInt);
        expect(raw).to.be.an('array');
        expect(raw.length).to.be.greaterThan(0);

        const args = await this.test.registry.getProviderArgsLength.call(owner,specifier);
        expect(raw.length).to.be.equal(+args.valueOf());
    });

    it("REGISTRY_13 - getProviderCurve() - Check that cant get uninitialized curve ", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await expect(this.test.registry.getProviderCurve.call(owner, specifier, { from: owner })).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("REGISTRY_14 - setEndpointParams() - Check that we can set endpoint params", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const newParams = ["p", "a", "r", "a", "m", "s"];

        await this.test.registry.setEndpointParams(specifier, newParams, { from: owner });

        const p1 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);
        const p2 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 1);
        const p3 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 2);
        const p4 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 3);
        const p5 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 4);
        const p6 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 5);

        await expect(Utils.fetchPureArray([p1.valueOf(), p2.valueOf(), p3.valueOf(), p4.valueOf(), p5.valueOf(), p6.valueOf()], hex2a)).to.have.deep.members(newParams);
    });

    it("REGISTRY_15 - getNextProvider() - Check that we can iterate through providers", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await this.test.registry.initiateProvider(publicKey + 1, title + "1", specifier + "1", params, { from: accounts[1] });

        await this.test.registry.initiateProvider(publicKey + 2, title + "2", specifier + "2", params, { from: accounts[2] });

        let index = 0;
        let res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title);
        index = parseInt(res[0].valueOf());

        res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title + "1");
        index = parseInt(res[0].valueOf());

        res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title + "2");
        index = parseInt(res[0].valueOf());

        await expect(index).to.be.equal(0);
    });
});
