import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils');

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Bondage = artifacts.require("Bondage");
const Registry = artifacts.require("Registry");
const ZapToken = artifacts.require("ZapToken");
const Dispatch = artifacts.require("Dispatch");
const Arbiter = artifacts.require("Arbiter");
const Cost = artifacts.require("CurrentCost");

contract('Bondage', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const zeroAddress = Utils.ZeroAddress;

    const piecewiseFunction = [3, 0, 0, 2, 10000];
    const broker = 0;

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");
    const dotBound = new BigNumber("999");

    async function prepareProvider(provider = true, curve = true, account = oracle, curveParams = piecewiseFunction, bondBroker = broker) {
        if (provider) await this.registry.initiateProvider(publicKey, title, {from: account});
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, bondBroker, {from: account});
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, {from: owner}).should.be.fulfilled;
        await this.token.allocate(allocAddress, tokensForSubscriber, {from: owner}).should.be.fulfilled;
        await this.token.approve(this.bondage.address, approveTokens, {from: subscriber}).should.be.fulfilled;
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

        // Hack for making arbiter an account we control for testing the escrow
        await this.currentTest.coord.addImmutableContract('ARBITER', accounts[3]);

        await this.currentTest.coord.updateAllDependencies({ from: owner });
    });

    it("BONDAGE_1 - bond() - Check bond function", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, dotBound, {from: subscriber});
    });


    it("BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {
        await prepareTokens.call(this.test);
        await expect(this.test.bondage.bond(oracle, specifier, 1, {from: subscriber})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, { from: subscriber });
        await prepareTokens.call(this.test);
        await expect(this.test.bondage.bond(oracle, specifier, 1, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_4 - unbond() - Check unbond function", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, 1, {from: subscriber}).should.be.fulfilled;
        await this.test.bondage.unbond(oracle, specifier, 1, {from: subscriber}).should.be.fulfilled;
    });

    it("BONDAGE_5 - calcZapForDots() - Check zap for dots calculating", async function () {
        const totalBound = 5;

        await this.test.registry.initiateProvider(publicKey, title, { from: accounts[5] });
        await this.test.registry.initiateProviderCurve(specifier, piecewiseFunction, broker, { from: accounts[5] });

        const structure = Utils.structurizeCurve(piecewiseFunction);
        const fun0Calc = Utils.calcDotsCost(structure, totalBound);
        const res0 = await this.test.bondage.calcZapForDots.call(accounts[5], specifier, totalBound);
        res0.should.be.bignumber.equal(web3.toBigNumber(fun0Calc));
    });

    it("BONDAGE_6 - calcZapForDots() - Check that function revert if curve not intialized", async function () {
        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, { from: oracle });
        await expect(this.test.bondage.calcZapForDots.call(oracle, specifier, 5)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_7 - unbond() - Check unbond zap for dots calculation", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        let balance = await this.test.token.balanceOf(subscriber);
        // we will get 5 dots with current curve (n: [1-5], p = 2n^2)
        await this.test.bondage.bond(oracle, specifier, 5, {from: subscriber});

        const bond_balance = await this.test.token.balanceOf(subscriber);

        // unbond three dots
        await this.test.bondage.unbond(oracle, specifier, 3, {from: subscriber});
        const final_balance = await this.test.token.balanceOf(subscriber);

        // expect total bonding to cost 110 and unbonding to return 100 zap (50+32+18)
        balance.minus(bond_balance).should.be.bignumber.equal(web3.toBigNumber(110));
        final_balance.minus(bond_balance).should.be.bignumber.equal(web3.toBigNumber(100));
    });

    it("BONDAGE_7_big - unbond() - Check unbond zap for dots calculation", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        let balance = await this.test.token.balanceOf(subscriber);

        // we will get 5 dots with current curve (n: [1-9999], p = 2n^2)
        await this.test.bondage.bond(oracle, specifier, 9999, {from: subscriber});

        const bond_balance = await this.test.token.balanceOf(subscriber);

        // unbond three dots
        await this.test.bondage.unbond(oracle, specifier, 3, {from: subscriber});
        const final_balance = await this.test.token.balanceOf(subscriber);

        // ghci> let f x = 2 * x ^ 2
        // ghci> sum $ f <$> [1..9999]
        // >>> 666566670000
        // ghci> sum $ f <$> [9999,9998..9997]
        // >>> 599760028
        balance.minus(bond_balance).should.be.bignumber.equal(new BigNumber("666566670000"));
        final_balance.minus(bond_balance).should.be.bignumber.equal(new BigNumber("599760028"));
    });

    it("BONDAGE_8 - getBoundDots() - Check received dots getting", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const res = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier, { from: subscriber });
        res.should.be.bignumber.equal(web3.toBigNumber(3));
    });

    it("BONDAGE_9 - getBoundDots() - Check that number of dots of unbonded provider is 0", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        const res = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier, { from: subscriber });
        res.should.be.bignumber.equal(web3.toBigNumber(0));
    });


    it("BONDAGE_10 - getZapBound() - Check received ZAP getting", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const res = await this.test.bondage.getZapBound.call(oracle, specifier, { from: subscriber });
        res.should.be.bignumber.equal(web3.toBigNumber(28));
    });

    it("BONDAGE_11 - getZapBound() - Check that received ZAP of unbonded provider is 0", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        const res = await this.test.bondage.getZapBound.call(oracle, specifier, { from: subscriber });
        res.should.be.bignumber.equal(web3.toBigNumber(0));
    });

    it("BONDAGE_12 - escrowDots() - Check that operator can escrow dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, {from: accounts[3]});

        const subscriberDots = await this.test.bondage.getBoundDots(subscriber, oracle, specifier, {from: subscriber});
        subscriberDots.should.be.bignumber.equal(web3.toBigNumber(dots - dotsForEscrow));

        const escrowDots = await this.test.bondage.getNumEscrow(subscriber, oracle, specifier);
        escrowDots.should.be.bignumber.equal(web3.toBigNumber(dotsForEscrow));
    });

    it("BONDAGE_13 - escrowDots() - Check that not operator can't escrow dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        await expect(this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[2] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_14 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        /// we will get 0 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 0, { from: subscriber });

        const dots = 0;
        const dotsForEscrow = 2;

        await expect(this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, {from: accounts[3]})).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_15 - releaseDots() - Check that operator can release dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, {from: accounts[3]});
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow, {from: accounts[3]});

        const subscriberDots = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier,);
        subscriberDots.should.be.bignumber.equal(web3.toBigNumber(dots - dotsForEscrow));

        const pendingDots = await this.test.bondage.getNumEscrow.call(subscriber, oracle, specifier);
        pendingDots.should.be.bignumber.equal(web3.toBigNumber(0));

        const releaseDots = await this.test.bondage.getBoundDots.call(oracle, oracle, specifier, {from: oracle});
        releaseDots.should.be.bignumber.equal(web3.toBigNumber(dotsForEscrow));
    });

    it("BONDAGE_16 - releaseDots() - Check that operator can't release dots if trying to release more dots than escrowed", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, { from: subscriber });

        const dots = 3;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await expect(this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow + 2, { from: accounts[3] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_17 - getDotsIssued() - Check that issued dots will increase with every bond", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, { from: subscriber });
        // get another dot
        await this.test.bondage.bond(oracle, specifier, 1, { from: subscriber });

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        issuedDots.should.be.bignumber.equal(web3.toBigNumber(4));
    });

    it("BONDAGE_18 - getDotsIssued() - Check that issued dots will decrease with every unbond", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, { from: subscriber });
        // and another to get 4 dots total
        await this.test.bondage.bond(oracle, specifier, 1, { from: subscriber });

        await this.test.bondage.unbond(oracle, specifier, 1, { from: subscriber });

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        issuedDots.should.be.bignumber.equal(web3.toBigNumber(3));
    });

    it("BONDAGE_19 - bond() - Check bond function", async function () {
         await prepareProvider.call(this.test);
         await prepareTokens.call(this.test);

         await expect(this.test.bondage.bond(oracle, specifier, approveTokens, {from: subscriber})).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_20 - delegateBond() - Check that delegate bond can be executed", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test, accounts[4]);

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, dotBound, {from: accounts[4]});
    });

    it("BONDAGE_21 - returnDots() - Check that dots can be returned", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;
        const dotsForReturn = 1;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, {from: accounts[3]});
        await this.test.bondage.returnDots(subscriber, oracle, specifier, dotsForReturn, {from: accounts[3]});

        const subscriberDots = await this.test.bondage.getBoundDots(subscriber, oracle, specifier, {from: subscriber});
        subscriberDots.should.be.bignumber.equal(web3.toBigNumber(dots - dotsForEscrow + dotsForReturn));

        const escrowDots = await this.test.bondage.getNumEscrow(subscriber, oracle, specifier);
        escrowDots.should.be.bignumber.equal(web3.toBigNumber(dotsForEscrow - dotsForReturn));
    });

    it("BONDAGE_22 - returnDots() - Check that more dots can't be returned than already escrowed", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;
        const dotsForReturn = 1;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await expect(this.test.bondage.returnDots(subscriber, oracle, specifier, dotsForEscrow + 1, { from: accounts[3] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_23 - returnDots() - Check that more dots can't be called by someone who isn't the owner", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, { from: subscriber });

        const dots = 3;
        const dotsForEscrow = 2;
        const dotsForReturn = 1;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await expect(this.test.bondage.returnDots(subscriber, oracle, specifier, dotsForEscrow + 1, { from: accounts[0] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_24 - bond() - Check that broker can bond to its endpoint", async function () {
        await this.test.token.allocate(oracle, tokensForOwner, {from: owner});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: oracle});

        let testBroker = oracle;
        await this.test.registry.initiateProvider(publicKey, title, {from: oracle});
        await this.test.registry.initiateProviderCurve(specifier, piecewiseFunction, testBroker, {from: oracle});

        let savedBroker = await this.test.registry.getEndpointBroker(oracle, specifier, {from: oracle});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 3, { from: oracle });

        const res = await this.test.bondage.getZapBound.call(oracle, specifier, { from: oracle });
        res.should.be.bignumber.equal(web3.toBigNumber(28));
    });


    it("BONDAGE_25 - bond() - Check that nonbroker cannot bond to broker endpoint", async function () {

        await this.test.token.allocate(subscriber, tokensForOwner, { from: owner });

        await this.test.registry.initiateProvider(publicKey, title, { from: oracle });
        await this.test.registry.initiateProviderCurve(specifier, piecewiseFunction, oracle, { from: oracle });

        let savedBroker = await this.test.registry.getEndpointBroker(oracle, specifier, { from: subscriber });

        await expect(this.test.bondage.bond(oracle, specifier, 3, { from: subscriber })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_26 - bond() - Check registry.clearEndpoint cannot be applied to a bonded curve", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, dotBound, { from: subscriber });

        await expect(this.test.registry.clearEndpoint( specifier, { from: oracle })).to.eventually.be.rejectedWith(EVMRevert);
    });
});


contract('CurrentCost', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const zeroAddress = Utils.ZeroAddress;
    const broker = zeroAddress;

    // 2 x ^ 2 on [1, 1000]
    const curveParams1 = [3, 0, 0, 2, 1000];

    // 1 + 2 x + 3 x ^ 2 on [1, 1000]
    const curveParams2 = [3, 1, 2, 3, 1000];

    // 10 on [1, 1000]
    const curveParams3 = [1, 10, 1000];

    // 1 + 2 x + 3 x ^ 2 on [1, 10]
    // 2 on [10, 20]
    const curveParams4 = [3, 1, 2, 3, 10, 1, 2, 20];

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider(provider = true, curve = true, account = oracle, curveParams) {
        if (provider) await this.registry.initiateProvider(publicKey, title, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, broker, { from: account });
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
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

        await this.currentTest.coord.updateAllDependencies({ from: owner });
    });

    it("CURRENT_COST_1 - _currentCostOfDot() - Check current cost for function 1", async function () {
        await prepareProvider.call(this.test, true, true, oracle, curveParams1);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams1);
        const cost = Utils.calcNextDotCost(structure, dotNumber);

        const res = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        res.should.be.bignumber.equal(web3.toBigNumber(cost));
    });

    it("CURRENT_COST_2 - _currentCostOfDot() - Check current cost for function 2", async function () {
        await prepareProvider.call(this.test, true, true, oracle, curveParams2);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams2);
        const cost = Utils.calcNextDotCost(structure, dotNumber);

        const res = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        res.should.be.bignumber.equal(web3.toBigNumber(cost));
    });

    it("CURRENT_COST_3 - _currentCostOfDot() - Check current cost for function 3", async function () {
        await prepareProvider.call(this.test, true, true, oracle, curveParams3);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams3);
        const cost = Utils.calcNextDotCost(structure, dotNumber);

        const res = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        res.should.be.bignumber.equal(web3.toBigNumber(cost));
    });

    it("CURRENT_COST_4 - _currentCostOfDot() - Check current cost for function 4", async function () {
        await prepareProvider.call(this.test, true, true, oracle, curveParams4);

        const dotNumber = 20;
        const structure = Utils.structurizeCurve(curveParams4);
        const cost = Utils.calcNextDotCost(structure, dotNumber);

        const res = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        res.should.be.bignumber.equal(web3.toBigNumber(cost));
    });

    it("CURRENT_COST_5 - _costOfNDots() - Check cost of n-dots for function 4", async function () {
        await prepareProvider.call(this.test, true, true, oracle, curveParams4);

        const dotNumber = 20;
        const structure = Utils.structurizeCurve(curveParams4);
        const cost = Utils.calcDotsCost(structure, dotNumber);

        const res = await this.test.cost._costOfNDots.call(oracle, specifier, 1, dotNumber - 1);
        res.should.be.bignumber.equal(web3.toBigNumber(cost));
        // checking that Utils.calcDotsCost is working properly
        // ghci> let f x = 1 + 2 * x + 3 * x^2
        // ghci> sum (f <$> [1..10]) + 2 * 10
        // >>> 1295
        res.should.be.bignumber.equal(web3.toBigNumber(1295));
    });
});
