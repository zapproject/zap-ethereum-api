// TODO: FIX BONDAGESTORAGE RELEASE FUNCTION!!!!!!!
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');

const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const ZapToken = artifacts.require("ZapToken");
const Dispatch = artifacts.require("Dispatch");
const Arbiter = artifacts.require("Arbiter");
const Cost = artifacts.require("CurrentCost");
const Addresses = artifacts.require("AddressSpacePointer");

contract('Bondage', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider(provider = true, curve = true, account = oracle, type = curveLinear) {
        if (provider) await this.registry.initiateProvider(publicKey, title, specifier, params, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, type, start, mul, { from: account });
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);

        this.currentTest.token = await ZapToken.new();

        this.currentTest.cost = await Cost.new(Addresses.address ,this.currentTest.registry.address);

        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(Addresses.address, this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);


    });

    it("BONDAGE_1 - bond() - Check bond function", async function () {

        await prepareProvider.call(this.test);      
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
            
        await this.test.bondage.bond(oracle, specifier, 100, {from: subscriber});
    });

    it("BONDAGE_2 - bond() - Check that we can't bond oracle with unregistered provider", async function () {

        //prepareProvider.call(this.test, false, false);

        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await expect(this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("BONDAGE_3 - bond() - Check that we can't bond oracle with uninitialized curve", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: subscriber });
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await expect(this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_4 - unbond() - Check unbond function", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.bond(oracle, specifier, 1000, {from: subscriber});

        await this.test.bondage.unbond(oracle, specifier, 500, {from: subscriber});
    });

    it("BONDAGE_5 - calcTokForDots() - Check tok for dots calculating", async function () {
    
        //prepareProvider.call(this.test, true, true, accounts[5], curveLinear);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[5] });
        await this.test.registry.initiateProviderCurve(specifier, curveLinear, start, mul, { from: accounts[5] });
        

        const jsLinearTok = Utils.calculateTokWithLinearCurve(5, start, mul);
        const res1 = await this.test.bondage.calcTokForDots.call(accounts[5], specifier, 5);
        const ethLinearTok = parseInt(res1.valueOf());

        await expect(jsLinearTok).to.be.equal(ethLinearTok);

        //prepareProvider.call(this.test, true, true, accounts[6], curveExponential);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[6] });
        await this.test.registry.initiateProviderCurve(specifier, curveExponential, start, mul, { from: accounts[6] });
        
        const jsExponentialTok = Utils.calculateTokWithExponentialCurve(5, start, mul);
        const res2 = await this.test.bondage.calcTokForDots.call(accounts[6], specifier, 5);
        const ethExponentialTok = parseInt(res2.valueOf());

        await expect(jsExponentialTok).to.be.equal(ethExponentialTok);

        //prepareProvider.call(this.test, true, true, accounts[7], curveLogarithmic);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: accounts[7] });
        await this.test.registry.initiateProviderCurve(specifier, curveLogarithmic, start, mul, { from: accounts[7] });
        
        const jsLogarithmicTok = Utils.calculateTokWithLogarithmicCurve(5, start, mul);
        const res3 = await this.test.bondage.calcTokForDots.call(accounts[7], specifier, 5);
        const ethLogarithmicTok = parseInt(res3.valueOf());

        await expect(jsLogarithmicTok).to.be.equal(ethLogarithmicTok);
    });

    it("BONDAGE_6 - calcTokForDots() - Check that function throw error if curve not intialized", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: oracle });
        
        await expect(this.test.bondage.calcTokForDots.call(oracle, specifier, 5)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_7 - calcBondRate()) - Check calcBondRate function", async function () {

        await prepareProvider.call(this.test);
        
        const res1 = await this.test.bondage.calcBondRate.call(oracle, specifier, 26);
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(5);
        await expect(ethTok).to.be.equal(25);
    });

    it("BONDAGE_8 - calcBondRate()) - Check calcBondRate function throw error if curve not initialized", async function () {

        //prepareProvider.call(this.test, true, false);
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: oracle });

        await expect(this.test.bondage.calcBondRate.call(oracle, specifier, 26)).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("BONDAGE_9 - calcBondRate()) - Check calcBondRate function return 0 dots if numTok is 0", async function () {

        await prepareProvider.call(this.test);

        const res1 = await this.test.bondage.calcBondRate.call(oracle, specifier, 0);
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(0);
        await expect(ethTok).to.be.equal(0);
    });

    it("BONDAGE_10 - calcBondRate()) - Check calcBondRate function return maximum dots and maximum tok if numTok is more than 1000", async function () {

        await prepareProvider.call(this.test);

        const jsLinearTok = Utils.calculateTokWithLinearCurve(32, start, mul);
        const jsLinearTokWillUsed = Utils.calculateTokWithLinearCurve(31, start, mul);

        const res1 = await this.test.bondage.calcBondRate.call(oracle, specifier, jsLinearTok);
        const ethTok = parseInt(res1[0].valueOf());
        const ethDots = parseInt(res1[1].valueOf());

        await expect(ethDots).to.be.equal(31);
        await expect(ethTok).to.be.equal(jsLinearTokWillUsed);
    });

    it("BONDAGE_11 - getDots() - Check received dots getting", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const res = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(5);
    });

    it("BONDAGE_12 - getDots() - Check that number of dots of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const receivedDots = parseInt(res.valueOf());

        await expect(receivedDots).to.be.equal(0);
    });


    it("BONDAGE_13 - getTokBound() - Check received tok getting", async function () {
        
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // with current linear curve (startValue = 1, multiplier = 2) number of dots received should be equal to 5
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const res = await this.test.bondage.getTokBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(25);
    });

    it("BONDAGE_14 - getTokBound() - Check that received tok of unbonded provider is 0", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        const res = await this.test.bondage.getTokBound.call(oracle, specifier, { from: subscriber });
        const receivedTok = parseInt(res.valueOf());

        await expect(receivedTok).to.be.equal(0);
    });

    it("BONDAGE_15 - escrowDots() - Check that operator can escrow dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber}); 
        
        await this.test.bondage.updateContract();

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_16 - escrowDots() - Check that not operator can't escrow dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        
        const subscriberDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots);
        await expect(escrowDots).to.be.equal(0);
    });

    it("BONDAGE_17 - escrowDots() - Check that operator can't escrow dots from oracle that haven't got enough dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.updateContract();

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 0, {from: subscriber});

        const dots = 0;
        const dotsForEscrow = 2;

       // await this.test.bondage.setDispatchAddress(accounts[3], { from: owner });
        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        
        const subscriberDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        await expect(subscriberDots).to.be.equal(0);
        await expect(escrowDots).to.be.equal(0);
    });

    it("BONDAGE_18 - releaseDots() - Check that operator can release dots", async function () {
    
        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.updateContract();

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier,);
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const pendingDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const pendingDots = parseInt(pendingDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(pendingDots).to.be.equal(0);
        await expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_19 - releaseDots() - Check that operator can release dots if trying to release more dots than escrowed", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        await this.test.bondage.updateContract();

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});

        const dots = 5;
        const dotsForEscrow = 2;

        const forRelease = accounts[8];

        await this.test.bondage.escrowDots(subscriber, oracle, specifier, dotsForEscrow, { from: accounts[3] });
        await this.test.bondage.releaseDots(subscriber, oracle, specifier, dotsForEscrow + 2, { from: accounts[3] });

        const subscriberDotsRes = await this.test.bondage.getDots.call(subscriber, oracle, specifier, { from: subscriber });
        const subscriberDots = parseInt(subscriberDotsRes.valueOf());

        const escrowDotsRes = await this.test.bondStor.getNumEscrow.call(subscriber, oracle, specifier);
        const escrowDots = parseInt(escrowDotsRes.valueOf());

        const releaseRes = await this.test.bondage.getDots.call(oracle, oracle, specifier, { from: oracle });
        const releaseDots = parseInt(releaseRes.valueOf());

        await expect(subscriberDots).to.be.equal(dots - dotsForEscrow);
        await expect(escrowDots).to.be.equal(0);
        await expect(releaseDots).to.be.equal(dotsForEscrow);
    });

    it("BONDAGE_20 - getDotsIssued() - Check that issued dots will increase with every bond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        
        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 14, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(6);
    });

    it("BONDAGE_21 - getDotsIssued() - Check that issued dots will decrease with every unbond", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});

        // we get 5 dots with current linear curve (start = 1, mul = 2)
        await this.test.bondage.bond(oracle, specifier, 26, {from: subscriber});
        await this.test.bondage.bond(oracle, specifier, 14, {from: subscriber});

        await this.test.bondage.unbond(oracle, specifier, 1, {from: subscriber});

        const issuedDots = await this.test.bondage.getDotsIssued.call(oracle, specifier);
        await expect(parseInt(issuedDots.valueOf())).to.be.equal(5);
    });

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
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;
    
    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");

    async function prepareProvider(provider = true, curve = true, account = oracle, type = curveLinear) {
        if (provider) await this.registry.initiateProvider(publicKey, title, specifier, params, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, type, start, mul, { from: account });
    }

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);

        this.currentTest.token = await ZapToken.new();

        this.currentTest.cost = await Cost.new(Addresses.address ,this.currentTest.registry.address);

        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(Addresses.address, this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

    });

    it("CURRENT_COST_1 - _currentCostOfDot() - Check current cost for linear function", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveLinear);

        const dotNumber = 27;
        const linearDotCost = mul * dotNumber + start

        const res1 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const ethLinearRes = parseInt(res1.valueOf());

        expect(ethLinearRes).to.be.equal(linearDotCost);
    });

    it("CURRENT_COST_2 - _currentCostOfDot() - Check current cost for exponential function", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveExponential);

        const dotNumber = 27;
        const expDotCost = mul * Math.pow(dotNumber, 2) + start;

        const res2 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const ethExpRes = parseInt(res2.valueOf());

        expect(ethExpRes).to.be.equal(expDotCost);
    });

    it("CURRENT_COST_3 - _currentCostOfDot() - Check current cost for logarithmic function", async function () {

        await prepareProvider.call(this.test, true, true, oracle, curveLogarithmic);

        const dotNumber = 27;
        const logDotCost = Math.ceil(mul * Math.log2(dotNumber) + start);

        const res3 = await this.test.cost._currentCostOfDot.call(oracle, specifier, dotNumber);
        const ethLogrRes = parseInt(res3.valueOf());

        expect(ethLogrRes).to.be.equal(logDotCost);
    }); 

/* ONLY PASSES WHEN VISIBILITY OF fastlog2 IS PUBLIC
    it("CurrentCost_2 - fastlog2() - Check log2 calculations", async function () {
        async function checkLog(value) {
            let jsResult = Math.ceil(Math.log2(value));
            let res = await this.bondage.fastlog2.call(value, { from: owner });
            let ethResult = parseInt(res.valueOf());
            expect(jsResult).to.be.equal(ethResult);
        }
        for (var i = 0; i <= 100; i++) checkLog.call(this.test, i);
    });
*/
    
});
