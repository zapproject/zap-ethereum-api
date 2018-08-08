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
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
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
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");
    const dotBound = new BigNumber("999");

    async function prepareProvider(provider = true, curve = true, account = oracle, curveParams = piecewiseFunction) {
        if (provider) await this.registry.initiateProvider(publicKey, title, specifier, params, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, { from: account });
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
        await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
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
        await this.currentTest.coord.setContract('ARBITER', accounts[3]);
        
        await this.currentTest.coord.updateAllDependencies({ from: owner });
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);
        
        await this.currentTest.db.setStorageContract(this.currentTest.regStor.address, true);
        await this.currentTest.db.setStorageContract(this.currentTest.bondStor.address, true);
    });

    it("BONDAGE_1 - bond() - Check bond function", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, dotBound, {from: subscriber});
    });

    it("BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {
        await prepareTokens.call(this.test);
        await expect(this.test.bondage.bond(oracle, specifier, 1, {from: subscriber})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: subscriber });
        await prepareTokens.call(this.test);
        await expect(this.test.bondage.bond(oracle, specifier, 1, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_4 - unbond() - Check unbond function", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(oracle, specifier, 1, {from: subscriber});
        await this.test.bondage.unbond(oracle, specifier, 1, {from: subscriber});
    });

    it("BONDAGE_5 - calcZapForDots() - Check zap for dots calculating", async function () {
        const totalBound = 5;

        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[5] });
        await this.test.registry.initiateProviderCurve(specifier, piecewiseFunction, { from: accounts[5] });

        const structure = Utils.structurizeCurve(piecewiseFunction);
        const fun0Calc = Utils.calcDotsCost(structure, totalBound);
        const res0 = await this.test.bondage.calcZapForDots.call(accounts[5], specifier, totalBound);
        const fun0Res = parseInt(res0.valueOf());

        await expect(fun0Res).to.be.equal(fun0Calc);
    });

    it("BONDAGE_6 - calcZapForDots() - Check that function revert if curve not intialized", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: oracle });
        await expect(this.test.bondage.calcZapForDots.call(oracle, specifier, 5)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_10 - unbond() - Check unbond zap for dots calculation", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        let balance = await this.test.token.balanceOf(subscriber);
        // we will get 5 dots with current curve (n: [1-5], p = 2n^2)
        await this.test.bondage.bond(oracle, specifier, 5, {from: subscriber});

        const bond_balance = await this.test.token.balanceOf(subscriber);

        // unbond three dots
        await this.test.bondage.unbond(oracle, specifier, 3, {from: subscriber});
        const final_balance = await this.test.token.balanceOf(subscriber);

        const delta1 = balance.minus(bond_balance).toString();
        const delta2 = final_balance.minus(bond_balance).toString();

        // expect total bonding to cost 110 and unbonding to return 100 zap (50+32+18)
        await expect(delta1).to.be.equal("110");
        await expect(delta2).to.be.equal("100");
    });

    it("BONDAGE_11 - getBoundDots() - Check received dots getting", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const res = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(3);
    });

    it("BONDAGE_12 - getBoundDots() - Check that number of dots of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(0);
    });


    it("BONDAGE_13 - getZapBound() - Check received ZAP getting", async function () {
        
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const res = await this.test.bondage.getZapBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(28);
    });

    it("BONDAGE_14 - getZapBound() - Check that received ZAP of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getZapBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(0);
    });

    it("BONDAGE_15 - escrowDots() - Check that operator can escrow dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber}); 

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getBoundDots(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_16 - escrowDots() - Check that not operator can't escrow dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        await expect(this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[2] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_17 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        /// we will get 0 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 0, {from: subscriber});

        const dots = 0;
        const dotsForEscrow = 2;

        await expect(this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] })).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_18 - releaseDots() - Check that operator can release dots", async function () {
    
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier,);
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const pendingDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const pendingDots = parseInt(pendingDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getBoundDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(pendingDots).to.be.equal(0);
        await expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_19 - releaseDots() - Check that operator can release dots if trying to release more dots than escrowed", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});

        const dots = 3;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow + 2, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getBoundDots.call(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getBoundDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(0);
        await expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_20 - getDotsIssued() - Check that issued dots will increase with every bond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});
        // get another dot
        await this.test.bondage.bond(oracle, specifier, 1, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(4);
    });

    it("BONDAGE_21 - getDotsIssued() - Check that issued dots will decrease with every unbond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we will get 3 dots with current curve
        await this.test.bondage.bond(oracle, specifier, 3, {from: subscriber});
        // and another to get 4 dots total
        await this.test.bondage.bond(oracle, specifier, 1, {from: subscriber});

        await this.test.bondage.unbond(oracle, specifier, 1, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(3);
    });


    it("BONDAGE_22 - bond() - Check bond function", async function () {

         await prepareProvider.call(this.test);
         await prepareTokens.call(this.test);
         await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

         await expect(this.test.bondage.bond(oracle, specifier, approveTokens, {from: subscriber})).to.be.eventually.be.rejectedWith(EVMRevert);
    });

    /*
    it("BONDAGE_22 - delegateBond() - Check that delegate bond can be executed", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
            
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 100, {from: accounts[4]});
    });
    it("BONDAGE_23 - delegateBond() - Check that delegate bond can not be performed twice from same address before it was reseted", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
            
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 100, {from: accounts[4]});
        await expect(this.test.bondage.delegateBond(subscriber, oracle, specifier, 100, {from: accounts[4]})).to.eventually.be.rejectedWith(EVMRevert);
    });
    it("BONDAGE_24 - delegateUnbond() - Check that delegate unbond can be executed", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 1000, {from: accounts[4]});
        await this.test.bondage.delegateUnbond(subscriber, oracle, specifier, 500, {from: accounts[4]});
    });
    it("BONDAGE_25 - delegateUnbond() - Check that delegate unbond can be executed only if delegate specified", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});
        await expect(this.test.bondage.delegateUnbond(subscriber, oracle, specifier, 500, {from: accounts[4]})).to.eventually.be.rejectedWith(EVMRevert);
    });
    it("BONDAGE_26 - resetDelegate() - Check that delegate can be reseted", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
            
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 100, {from: accounts[4]});
        await this.test.bondage.resetDelegate(oracle, {from: subscriber});
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 100, {from: accounts[4]});
    });
    it("BONDAGE_27 - resetDelegate() - Check that unbond will not executed after reset", async function () {
        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test, accounts[4]);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: accounts[4]});
            
        await this.test.bondage.delegateBond(subscriber, oracle, specifier, 1000, {from: accounts[4]});
        await this.test.bondage.resetDelegate(oracle, {from: subscriber});
        await expect(this.test.bondage.delegateUnbond(subscriber, oracle, specifier, 500, {from: accounts[4]})).to.eventually.be.rejectedWith(EVMRevert);
    });
    */
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

    // 2 x ^ 2
    const curveParams1 = [3, 0, 0, 2, 1000];

    // 1 + 2 x + 3 x ^ 2
    const curveParams2 = [3, 1, 2, 3, 1000];

    const curveParams3 = [1, 10, 1000];
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider(provider = true, curve = true, account = oracle, curveParams) {
        if (provider) await this.registry.initiateProvider(publicKey, title, specifier, params, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, { from: account });
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
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
        this.currentTest.bondStor = await RegistryStorage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('BONDAGE_STORAGE', this.currentTest.bondStor.address);

        // Deploy registry
        this.currentTest.registry = await Registry.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY', this.currentTest.registry.address);

        // Deploy current cost
        this.currentTest.cost = await Cost.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('CURRENT_COST', this.currentTest.cost.address);

        // Deploy Bondage
        this.currentTest.bondage = await Bondage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('BONDAGE', this.currentTest.bondage.address);
        
        await this.currentTest.coord.updateAllDependencies({ from: owner });
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);
        await this.currentTest.db.setStorageContract(this.currentTest.regStor.address, true);
    });

    it("CURRENT_COST_1 - _currentCostOfDot() - Check current cost for function 0", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveParams1);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams1);
        const fun0Cost = Utils.calcNextDotCost(structure, dotNumber);


        const res1 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const fun0Res = parseInt(res1.valueOf());

        await expect(fun0Res).to.be.equal(fun0Cost);
    });

    it("CURRENT_COST_2 - _currentCostOfDot() - Check current cost for function 1", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveParams2);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams2);
        const fun1Cost = Utils.calcNextDotCost(structure, dotNumber);


        const res2 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const fun1Res = parseInt(res2.valueOf());

        await expect(fun1Res).to.be.equal(fun1Cost);
    });

    it("CURRENT_COST_3 - _currentCostOfDot() - Check current cost for function > 1", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveParams3);

        const dotNumber = 3;
        const structure = Utils.structurizeCurve(curveParams3);
        const fun2Cost = Utils.calcNextDotCost(structure, dotNumber);


        const res3 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const fun2Res = parseInt(res3.valueOf());

        await expect(fun2Res).to.be.equal(fun2Cost);
    }); 
});
