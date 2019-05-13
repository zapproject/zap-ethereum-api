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
const FactoryToken = artifacts.require("FactoryToken");
const TokenFactory = artifacts.require("TokenFactory");
const SampleContest = artifacts.require("SampleContest");
const BTCcontest = artifacts.require("BTCcontest");

contract('SampleContest', function (accounts) {
    const owner = accounts[0];
    const participant1 = accounts[1];
    const participant2 = accounts[2];
    const oracle = accounts[3];
    const factoryOwner = accounts[4];
    const coincap = accounts[5]

    const publicKey = 111;
    const marketPublicKey = 222;
    const title = "test";
    const marketTitle = "test_1";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const marketSpecifier = "test_spec_1";
    const zeroAddress = Utils.ZeroAddress;

    const piecewiseFunction = [3, 0, 1, 0, 100000000000000];
    const broker = 0;

    const tokensForOwner = new BigNumber("150000000e18");
    const tokensForParts = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");
    const dotBound = new BigNumber("999");

    async function prepareTokens() {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(participant1, tokensForSubscriber, { from: owner });
        await this.token.allocate(participant2, tokensForSubscriber, { from: owner });
        await this.token.approve(this.bondage.address, approveTokens, {from: participant1});
        await this.token.approve(this.bondage.address, approveTokens, {from: participant2});
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
        // await this.currentTest.coord.addImmutableContract('ARBITER', accounts[3]);

        await this.currentTest.coord.updateAllDependencies({ from: owner });

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    function findEvent(logs, eventName) {
        for (let i = 0; i < logs.length; i++) {
            if (logs[i].event === eventName) {
                return logs[i];
            }
        }

        return null;
    }

    it("BTC CONTEST - lifecycle", async function () {
        const startPrice = 8000
        const upEndpoint = "BTC_UP"
        const downEndpoint = "BTC_DOWN"
        let factory = await SampleContest.new(this.test.coord.address, this.test.tokenFactory.address, publicKey, title);
        await this.test.registry.initiateProvider(111,"coincaptitle",{from:coincap});
        await this.test.registry.initiateProviderCurve("coincapendpoint",piecewiseFunction,zeroAddress,{from:coincap})

	let tx;//tmp var for event tracking

	let ttl = 10;//10 blocks contest period

	await factory.initializeCurve(upEndpoint,upEndpoint, piecewiseFunction);
	await factory.initializeCurve(downEndpoint,downEndpoint, piecewiseFunction);
  let btcContest = await BTCcontest.new(factory.address, startPrice, upEndpoint, downEndpoint);
        let reserveTokenAddr = await factory.reserveToken();
        let reserveToken = await ZapToken.at(reserveTokenAddr);
        await reserveToken.allocate(owner, tokensForOwner);
        await reserveToken.allocate(participant1, tokensForOwner, {from: owner});
        await reserveToken.allocate(participant2, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: participant1});
        await reserveToken.approve(factory.address, tokensForOwner, {from: participant2});
        await btcContest.bondToCoincap(coincap,"coincapendpoint",5,{from:owner})
	let zapBalance = await reserveToken.balanceOf(owner);
	let zapAllowance = await reserveToken.allowance(owner, factory.address);
	console.log('zap balance: ',zapBalance,', zap allowance: ',zapAllowance);
	await factory.initializeContest(btcContest.address, ttl, {from: owner});

//spec1 balance 1
        let curveTokenAddr = await factory.getTokenAddress(upEndpoint);
        let curveToken = await FactoryToken.at(curveTokenAddr);

	await factory.bond(upEndpoint, 7, {from: participant1});
	await factory.bond(downEndpoint, 8, {from: participant2});

//spec1 balancce 2
  let query_id = btcContest.queryToSettle(coincap,"coincap",{from:owner})
  const tx2 = await dispatch.respond(query_id,[9000],{from:coincap})
  //up endpoint should win
	console.log('tx ', tx2);

	let winValue = await factory.winValue();
	console.log('winValue: ', winValue.toNumber());


// //spec1 balancce 2
	upOwnerBalanceBefore = await curveToken.balanceOf(participant1);
  downOwnerBalanceBefore = await curveToken.balanceOf(participant2);


	console.log('participants balances: ', upOwnerBalance.toNumber(),downOwnerBalance.toNumber());
	// let after = await reserveToken.balanceOf(owner);
	// console.log('before: ',before.toString(),', after: ',after.toString());
  //       let subBalance = parseInt(await reserveToken.balanceOf(owner));
  //       await expect(subBalance).to.be.not.equal(10000)
    });
});
