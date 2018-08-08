import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const ZapToken = artifacts.require("ZapToken");
const Dispatch = artifacts.require("Dispatch");
const Arbiter = artifacts.require("Arbiter");
const ArbiterStorage = artifacts.require("ArbiterStorage");
const Cost = artifacts.require("CurrentCost");

contract('Arbiter', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";

    // test function: 2x^2
    const piecewiseFunction = [3, 0, 0, 2, 10000];
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider() {
        await this.registry.initiateProvider(publicKey, title, specifier, params, { from: oracle });
        await this.registry.initiateProviderCurve(specifier, piecewiseFunction, { from: oracle });
    }

    async function prepareTokens() {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(subscriber, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.token = await ZapToken.new();
        this.currentTest.coord = await ZapCoordinator.new();
        const owner = await this.currentTest.coord.owner();
        this.currentTest.db = await Database.new();
        await this.currentTest.coord.setContract('DATABASE', this.currentTest.db.address);
        await this.currentTest.coord.setContract('ZAP_TOKEN', this.currentTest.token.address);

        // Deploy storage
        this.currentTest.regStor = await RegistryStorage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY_STORAGE', this.currentTest.regStor.address);
        this.currentTest.bondStor = await BondageStorage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('BONDAGE_STORAGE', this.currentTest.bondStor.address);
        this.currentTest.arbStor = await ArbiterStorage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('ARBITER_STORAGE', this.currentTest.arbStor.address);


        // Deploy registry
        this.currentTest.registry = await Registry.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY', this.currentTest.registry.address);

        // Deploy current cost
        this.currentTest.cost = await Cost.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('CURRENT_COST', this.currentTest.cost.address);

        // Deploy Bondage
        this.currentTest.bondage = await Bondage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('BONDAGE', this.currentTest.bondage.address);

        // Deploy Arbiter
        this.currentTest.arbiter = await Arbiter.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('ARBITER', this.currentTest.arbiter.address);
        
        await this.currentTest.coord.updateAllDependencies({ from: owner });
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);
        await this.currentTest.arbStor.transferOwnership(this.currentTest.arbiter.address);
        
        await this.currentTest.db.setStorageContract(this.currentTest.regStor.address, true);
        await this.currentTest.db.setStorageContract(this.currentTest.bondStor.address, true);
        await this.currentTest.db.setStorageContract(this.currentTest.arbStor.address, true);
    });

    it("ARBITER_1 - initiateSubscription() - Check subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        const res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);
    });

    it("ARBITER_2 - initiateSubscription() - Check subscription block must be more than 0", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await expect(this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 0, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_3 - initiateSubscription() - Check user can inititate subscription for same subscriber once", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        const res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await expect(this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 5, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_4 - endSubscriptionProvider() - Check ending subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: oracle});

        res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    it("ARBITER_5 - endSubscriptionProvider() - Check that user can't end uninitialized subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        //await this.test.arbiter.initiateSubscription(oracle, params, specifier, publicKey, 10, {from: subscriber});

        await expect(this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: oracle})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_6 - endSubscriptionSubscriber() - Check ending subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: subscriber});

        res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(0);
    });

    it("ARBITER_7 - endSubscriptionSubscriber() - Check that user can't end uninitialized subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        //await this.test.arbiter.initiateSubscription(oracle, params, specifier, publicKey, 10, {from: subscriber});

        await expect(this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_8 - endSubscriptionSubscriber() - Check that only subscriber can end subscription by subscriber", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await expect(this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: accounts[7]})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_9 - endSubscriptionProvider() - Check that only provider can end subscription by provider", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        await expect(parseInt(res[0].valueOf())).to.be.equal(10);

        await expect(this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: accounts[7]})).to.eventually.be.rejectedWith(EVMRevert);
    });
});
