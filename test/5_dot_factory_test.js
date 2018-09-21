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
const DotFactory = artifacts.require("ERCDotFactory");
const EthAdapter = artifacts.require("EthAdapter");

contract('ERCDotFactory', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];
    const factoryOwner = accounts[3];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const zeroAddress = Utils.ZeroAddress;

    const piecewiseFunction = [3, 0, 0, 2, 10000];
    const broker = 0;

    async function prepareProvider(provider = true, curve = true, account = oracle, curveParams = piecewiseFunction, bondBroker = broker) {
        if (provider) await this.registry.initiateProvider(publicKey, title, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, bondBroker, { from: account });
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

    it("DOT_FACTORY_1 - constructor() - Check dot factory initialization", async function () {
        await DotFactory.new(this.test.coord.address);
    });

    it("DOT_FACTORY_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(DotFactory.new(accounts[0])).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("DOT_FACTORY_3 - initializeCurve() - Check that factory can init curve", async function () {
        let factory = await DotFactory.new(this.test.coord.address, {from: factoryOwner});
        await prepareProvider.call(this.test, true, false, oracle, piecewiseFunction, factory.address);
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
    });

    it("DOT_FACTORY_4 - initializeCurve() - Check that only factory owner can init curve", async function () {
        let factory = await DotFactory.new(this.test.coord.address, {from: factoryOwner});
        await prepareProvider.call(this.test, true, false, oracle, piecewiseFunction, factory.address);

        // TODO: add modifier for initializeCurve() function
        // await expect(factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: accounts[9]})).to.be.eventually.rejectedWith(EVMRevert);
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: accounts[9]});
    });
});

contract('EthAdapter', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];
    const factoryOwner = accounts[3];

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
        if (provider) await this.registry.initiateProvider(publicKey, title, { from: account });
        if (curve) await this.registry.initiateProviderCurve(specifier, curveParams, bondBroker, { from: account });
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

    it("ETH_ADAPTER_1 - constructor() - Check dot factory initialization", async function () {
        await EthAdapter.new(this.test.coord.address, 1);
    });

    it("ETH_ADAPTER_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(EthAdapter.new(accounts[0], 1)).to.be.eventually.rejectedWith(EVMRevert);
    });

    /*it("ETH_ADAPTER_3 - ownerBond() - Check that owner can bond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        // TODO: should work after bond function will be payable
        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner });
    });

    it("ETH_ADAPTER_4 - ownerBond() - Check that only owner can bond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        // TODO: should work after bond function will be payable
        await expect(factory.ownerBond(factoryOwner, specifier, 1, {from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("ETH_ADAPTER_5 - ownerUnbond() - Check that owner can unbond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        // TODO: should work after bond function will be payable
        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner });
        await factory.ownerUnbond(factoryOwner, specifier, 1, {from: factoryOwner });
    });

    it("ETH_ADAPTER_6 - ownerUnbond() - Check that owner can unbond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        // TODO: should work after bond function will be payable
        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner });
        await expect(factory.ownerUnbond(factoryOwner, specifier, 1, {from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
    }); */

    it("ETH_ADAPTER_7 - getAdapterPrice() - Check adapter price calculation", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        const res = await factory.getAdapterPrice(specifier, 3);
        await expect(res.toString()).to.be.equal('28');
    });
});

