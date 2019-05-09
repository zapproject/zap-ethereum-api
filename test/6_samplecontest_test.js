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

contract('SampleContest', function (accounts) {
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

    const piecewiseFunction = [3, 0, 1, 0, 100000000000000];
    const broker = 0;

    const tokensForOwner = new BigNumber("150000000e18");
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

    function findEvent(logs, eventName) {
        for (let i = 0; i < logs.length; i++) {
            if (logs[i].event === eventName) {
                return logs[i];
            }
        }

        return null;
    }

    it("SAMPLE_CONTEST_1 - lifecycle", async function () {
        let factory = await SampleContest.new(this.test.coord.address, this.test.tokenFactory.address, publicKey, title);
	let tx;//tmp var for event tracking
	let spec1 = 's1';
	let spec2 = 's2';
	
	let ttl = 10;
	
	await factory.initializeCurve(spec1,spec1, piecewiseFunction);
	await factory.initializeCurve(spec2,spec2, piecewiseFunction);
        let reserveTokenAddr = await factory.reserveToken();
        let reserveToken = await ZapToken.at(reserveTokenAddr);
        await reserveToken.allocate(owner, tokensForOwner);
        await reserveToken.allocate(subscriber, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: subscriber});
	let zapBalance = await reserveToken.balanceOf(owner);
	let zapAllowance = await reserveToken.allowance(owner, factory.address);
	console.log('zap balance: ',zapBalance,', zap allowance: ',zapAllowance);
	await factory.initializeContest(owner, ttl, {from: owner});

//spec1 balance 1 
        let curveTokenAddr = await factory.getTokenAddress(spec1);
        let curveToken = await FactoryToken.at(curveTokenAddr);

	let spec1OwnerBalance = await curveToken.balanceOf(owner);

	console.log('spec1 owner bal1: ', spec1OwnerBalance.toNumber()); 
	await factory.bond(spec1, 7, {from: owner});
	await factory.bond(spec2, 7, {from: subscriber});
	
//spec1 balancce 2
	spec1OwnerBalance = await curveToken.balanceOf(owner);

	console.log('spec1 owner bal2: ', spec1OwnerBalance.toNumber()); 
	await factory.close({from: owner});
	await factory.judge(spec1, {from: owner});
	tx = await factory.settle({from: owner});
	// console.log('tx ', tx);

	let winValue = await factory.winValue();
	console.log('winValue: ', winValue.toNumber());
	await curveToken.approve(factory.address, tokensForOwner, {from: owner});

	let before = await reserveToken.balanceOf(owner);
	tx = await factory.unbond(spec1,7,{from:owner}); 

// //spec1 balancce 2
	spec1OwnerBalance = await curveToken.balanceOf(owner);

	console.log('spec1 owner bal3: ', spec1OwnerBalance.toNumber()); 
	let after = await reserveToken.balanceOf(owner);
	console.log('before: ',before.toString(),', after: ',after.toString());
        let subBalance = parseInt(await reserveToken.balanceOf(owner));
        await expect(subBalance).to.be.not.equal(10000)
    });
});
