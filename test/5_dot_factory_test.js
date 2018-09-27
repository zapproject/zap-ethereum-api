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
const TokenAdapter = artifacts.require("TokenAdapter");
const EthGatedMarket = artifacts.require("EthGatedMarket_");
const FactoryToken = artifacts.require("FactoryToken");
const TokenFactory = artifacts.require("TokenFactory");

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

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("DOT_FACTORY_1 - constructor() - Check dot factory initialization", async function () {
        await DotFactory.new(this.test.coord.address, this.test.tokenFactory.address);
    });

    it("DOT_FACTORY_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(DotFactory.new(accounts[0], this.test.tokenFactory.address)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("DOT_FACTORY_3 - newToken() - Check that factory can create token", async function () {
        let factory = await DotFactory.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        await prepareProvider.call(this.test, true, false, oracle, piecewiseFunction, factory.address);
        let token = await factory.newToken('name', 'symbol', {from: factoryOwner});
    });

    it("DOT_FACTORY_4 - initializeCurve() - Check that factory can init curve", async function () {
        let factory = await DotFactory.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        await prepareProvider.call(this.test, true, false, oracle, piecewiseFunction, factory.address);
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
    });

    it("DOT_FACTORY_5 - initializeCurve() - Check that only factory owner can init curve", async function () {
        let factory = await DotFactory.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        await prepareProvider.call(this.test, true, false, oracle, piecewiseFunction, factory.address);

        // TODO: add onlyOwner modifier for initializeCurve() function
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

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("ETH_ADAPTER_1 - constructor() - Check dot factory initialization", async function () {
        await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1);
    });

    it("ETH_ADAPTER_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(EthAdapter.new(accounts[0], this.test.tokenFactory.address, 1)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("ETH_ADAPTER_3 - ownerBond() - Check that owner can bond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner, value: 18});
    });

    it("ETH_ADAPTER_4 - ownerBond() - Check that only owner can bond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await expect(factory.ownerBond(factoryOwner, specifier, 1, {from: accounts[1], value: 18})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("ETH_ADAPTER_5 - ownerUnbond() - Check that owner can unbond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1, {from: factoryOwner});

        let curveResult = await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 2, {from: factoryOwner, value: 18});
        await factory.ownerUnbond(factoryOwner, specifier, 1, {from: factoryOwner});
    });

    it("ETH_ADAPTER_6 - ownerUnbond() - Check that owner can unbond", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1, {from: factoryOwner});

        let curveResult = await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 2, {from: factoryOwner, value: 18});
        await expect(factory.ownerUnbond(factoryOwner, specifier, 1, {from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("ETH_ADAPTER_7 - getAdapterPrice() - Check adapter price calculation", async function () {
        let factory = await EthAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        const res = await factory.getAdapterPrice(specifier, 3);
        await expect(res.toString()).to.be.equal('28');
    });
});

contract('TokenAdapter', function (accounts) {
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

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("TOKEN_ADAPTER_1 - constructor() - Check dot factory initialization", async function () {
        await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, 1);
    });

    it("TOKEN_ADAPTER_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(TokenAdapter.new(accounts[0], this.test.tokenFactory.address, 1)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("TOKEN_ADAPTER_3 - ownerBond() - Check that owner can bond", async function () {
        let acceptedToken = await FactoryToken.new('Accepted Token', 'AT', {from: factoryOwner});
        let factory = await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, acceptedToken.address, {from: factoryOwner});
        await factory.setAdapterRate(1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await acceptedToken.mint(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await acceptedToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner, value: 18});
    });

    it("TOKEN_ADAPTER_4 - ownerBond() - Check that only owner can bond", async function () {
        let acceptedToken = await FactoryToken.new('Accepted Token', 'AT', {from: factoryOwner});
        let factory = await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, acceptedToken.address, {from: factoryOwner});
        await factory.setAdapterRate(1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await acceptedToken.mint(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await acceptedToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await expect(factory.ownerBond(factoryOwner, specifier, 1, {from: accounts[1], value: 18})).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("TOKEN_ADAPTER_5 - ownerUnbond() - Check that owner can unbond", async function () {
        let acceptedToken = await FactoryToken.new('Accepted Token', 'AT', {from: factoryOwner});
        let factory = await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, acceptedToken.address, {from: factoryOwner});
        await factory.setAdapterRate(1, {from: factoryOwner});
        let curveResult = await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await acceptedToken.mint(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await acceptedToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner, value: 18});
        await factory.ownerUnbond(factoryOwner, specifier, 1, {from: factoryOwner});
    });

    it("TOKEN_ADAPTER_6 - ownerUnbond() - Check that owner can unbond", async function () {
        let acceptedToken = await FactoryToken.new('Accepted Token', 'AT', {from: factoryOwner});
        let factory = await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, acceptedToken.address, {from: factoryOwner});
        await factory.setAdapterRate(1, {from: factoryOwner});
        let curveResult = await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;
        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await acceptedToken.mint(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await acceptedToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.ownerBond(factoryOwner, specifier, 1, {from: factoryOwner, value: 18});
        await expect(factory.ownerUnbond(factoryOwner, specifier, 1, {from: accounts[1] })).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("TOKEN_ADAPTER_7 - getAdapterPrice() - Check adapter price calculation", async function () {
        let acceptedToken = await FactoryToken.new('Accepted Token', 'AT', {from: factoryOwner});
        let factory = await TokenAdapter.new(this.test.coord.address, this.test.tokenFactory.address, acceptedToken.address, {from: factoryOwner});
        await factory.setAdapterRate(1, {from: factoryOwner});
        await factory.initializeCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        await prepareTokens.call(this.test, factory.address);

        const res = await factory.getAdapterPrice(specifier, 3);
        await expect(res.toString()).to.be.equal('28');
    });
});

contract('EthGatedMarket', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];
    const factoryOwner = accounts[3];

    const publicKey = 111;
    const marketPublicKey = 222;
    const title = "test";
    const marketTitle = "test_1";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const marketSpecifier = "test_spec_1";
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

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("ETH_GATED_MARKET_1 - constructor() - Check dot factory initialization", async function () {
        await EthGatedMarket.new(this.test.coord.address, this.test.tokenFactory.address);
    });

    it("ETH_GATED_MARKET_2 - constructor() - Check that address passed to constructor must be coordinator", async function () {
        await expect(EthGatedMarket.new(accounts[0], this.test.tokenFactory.address)).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("ETH_GATED_MARKET_3 - gatewayBond() - Check that owner can bond", async function () {
        let factory = await EthGatedMarket.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        let curveResult = await factory.initGatewayCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;
        await factory.setGatewayRate(1, {from: factoryOwner});

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.gatewayBond(1, {from: factoryOwner, value: 18});
    });

    it("ETH_GATED_MARKET_4 - gatewayUnbond() - Check that owner can bond", async function () {
        let factory = await EthGatedMarket.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        let curveResult = await factory.initGatewayCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let curveTokenAddress = curveResult.logs[1].args.tokenAddress;
        await factory.setGatewayRate(1, {from: factoryOwner});
        await factory.allowUnbond({from: factoryOwner});

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let curveToken = await FactoryToken.at(curveTokenAddress);
        await curveToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.gatewayBond(2, {from: factoryOwner, value: 18});
        await factory.gatewayUnbond(1, {from: factoryOwner});
    });

    it("ETH_GATED_MARKET_5 - marketBond() - Check that owner can bond", async function () {
        let factory = await EthGatedMarket.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        let gatewayCurveResult = await factory.initGatewayCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let gatewayCurveTokenAddress = gatewayCurveResult.logs[1].args.tokenAddress;
        let marketCurveResult = await factory.initMarketCurve(marketPublicKey, marketTitle, marketSpecifier, 'b', piecewiseFunction, {from: factoryOwner});
        let marketCurveTokenAddress = marketCurveResult.logs[1].args.tokenAddress;
        await factory.setGatewayRate(1, {from: factoryOwner});
        await factory.setMarketRate(1, {from: factoryOwner});
        await factory.allowUnbond({from: factoryOwner});

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let gatewayToken = await FactoryToken.at(gatewayCurveTokenAddress);
        await factory.allocateGatewayToken(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await gatewayToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});
        await gatewayToken.approve(owner, tokensForSubscriber, {from: factoryOwner});

        let marketToken = await FactoryToken.at(marketCurveTokenAddress);
        await marketToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.marketBond(marketSpecifier, 1, {from: factoryOwner, value: 18});
    });

    it("ETH_GATED_MARKET_6 - marketUnbond() - Check that owner can bond", async function () {
        let factory = await EthGatedMarket.new(this.test.coord.address, this.test.tokenFactory.address, {from: factoryOwner});
        let gatewayCurveResult = await factory.initGatewayCurve(publicKey, title, specifier, 'a', piecewiseFunction, {from: factoryOwner});
        let gatewayCurveTokenAddress = gatewayCurveResult.logs[1].args.tokenAddress;
        let marketCurveResult = await factory.initMarketCurve(marketPublicKey, marketTitle, marketSpecifier, 'b', piecewiseFunction, {from: factoryOwner});
        let marketCurveTokenAddress = marketCurveResult.logs[1].args.tokenAddress;
        await factory.setGatewayRate(1, {from: factoryOwner});
        await factory.setMarketRate(1, {from: factoryOwner});
        await factory.allowUnbond({from: factoryOwner});

        await prepareTokens.call(this.test, factory.address);

        await this.test.token.allocate(factoryOwner, tokensForSubscriber);
        await this.test.token.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        let gatewayToken = await FactoryToken.at(gatewayCurveTokenAddress);
        await factory.allocateGatewayToken(factoryOwner, tokensForSubscriber, {from: factoryOwner});
        await gatewayToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});
        await gatewayToken.approve(owner, tokensForSubscriber, {from: factoryOwner});

        let marketToken = await FactoryToken.at(marketCurveTokenAddress);
        await marketToken.approve(factory.address, tokensForSubscriber, {from: factoryOwner});

        await factory.marketBond(marketSpecifier, 2, {from: factoryOwner, value: 18});
        await factory.marketUnbond(marketSpecifier, 1, {from: factoryOwner});
    });
});
