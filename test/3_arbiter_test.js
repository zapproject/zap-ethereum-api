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
const Registry = artifacts.require("Registry");
const ZapToken = artifacts.require("ZapToken");
const Dispatch = artifacts.require("Dispatch");
const Arbiter = artifacts.require("Arbiter");
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
        await this.registry.initiateProvider(publicKey, title, { from: oracle });
        await this.registry.initiateProviderCurve(specifier, piecewiseFunction, Utils.ZeroAddress, {from: oracle});
    }

    async function prepareTokens() {
        await this.token.allocate(owner, tokensForOwner, {from: owner});
        await this.token.allocate(subscriber, tokensForSubscriber, {from: owner});
        await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.token = await ZapToken.new();
        this.currentTest.coord = await ZapCoordinator.new();
        const owner = await this.currentTest.coord.owner();
        this.currentTest.db = await Database.new();
        await this.currentTest.db.transferOwnership(this.currentTest.coord.address);

        await this.currentTest.coord.addImmutableContract('DATABASE', this.currentTest.db.address);
        await this.currentTest.coord.addImmutableContract('ZAP_TOKEN', this.currentTest.token.address);

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
    });

    it("ARBITER_1 - initiateSubscription() - Check subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        const res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));
    });

    it("ARBITER_2 - initiateSubscription() - Check subscription block must be more than 0", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await expect(this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 0, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_3 - initiateSubscription() - Check user can inititate subscription for same subscriber once", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        const res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        await expect(this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 5, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_4 - endSubscriptionProvider() - Check ending subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        await this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: oracle});

        res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(0));
    });

    it("ARBITER_5 - endSubscriptionProvider() - Check that user can't end uninitialized subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        //await this.test.arbiter.initiateSubscription(oracle, params, specifier, publicKey, 10, {from: subscriber});

        await expect(this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: oracle})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_6 - endSubscriptionSubscriber() - Check ending subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        await this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: subscriber});

        res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(0));
    });

    it("ARBITER_7 - endSubscriptionSubscriber() - Check that user can't end uninitialized subscription", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        //await this.test.arbiter.initiateSubscription(oracle, params, specifier, publicKey, 10, {from: subscriber});

        await expect(this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_8 - endSubscriptionSubscriber() - Check that only subscriber can end subscription by subscriber", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        await expect(this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: accounts[7]})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_9 - endSubscriptionProvider() - Check that only provider can end subscription by provider", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let res = await this.test.arbiter.getSubscription.call(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        await expect(this.test.arbiter.endSubscriptionProvider(subscriber, specifier, {from: accounts[7]})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ARBITER_10 - endSubscriptionProvider() - Check that subscriber receives any unused dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.bondage.bond(oracle, specifier, 100, {from: subscriber});

        let initBalance = await this.test.bondage.getBoundDots(subscriber, oracle, specifier);
        expect(initBalance.toString()).to.be.equal("100");
        await this.test.arbiter.initiateSubscription(oracle, specifier, params, publicKey, 10, {from: subscriber});

        let postEscrowBal = await this.test.bondage.getBoundDots(subscriber, oracle, specifier);
        expect(postEscrowBal.toString()).to.be.equal("90");

        let res = await this.test.arbiter.getSubscription(oracle, subscriber, specifier);
        res[0].should.be.bignumber.equal(web3.toBigNumber(10));

        const bondageEvents = this.test.bondage.allEvents({ fromBlock: 0, toBlock: 'latest' });
        bondageEvents.watch((err, res) => { });

        var mine = function() {
            return new Promise((resolve, reject) => {
                web3.currentProvider.sendAsync({
                  jsonrpc: "2.0",
                  method: "evm_mine",
                  id: 12345
                }, function(err, result){
                    resolve();
                });
            });
        };

        // mine 6 blocks
        await mine();
        await mine();
        await mine();
        await mine();
        await mine();
        await mine();

        // After blocks have been mined
        await this.test.arbiter.endSubscriptionSubscriber(oracle, specifier, {from: subscriber});
        let b_logs = bondageEvents.get();

        // 6 blocks have passed, and we include the first block in our calcuation, so we should receive 10-7=(3) dots back
        let postCancelBal = await this.test.bondage.getBoundDots(subscriber, oracle, specifier);
        expect(postCancelBal.toString()).to.be.equal("93");

        // check that the provider received their 7 dots
        let postCancelProviderBal = await this.test.bondage.getBoundDots(oracle, oracle, specifier);
        expect(postCancelProviderBal.toString()).to.be.equal("7");
    });
});
