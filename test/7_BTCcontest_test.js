import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const should = require('chai')
          .use(require('chai-as-promised'))
          .use(require('chai-bignumber')(web3.BigNumber))
          .should();

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

    const piecewiseFunction = [1,1000000000000000000, 100000000000000];
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

    async function findEvent(contract, eventName) {
      return new Promise((resolve,reject)=>{
        let eventN = contract[eventName]()
        eventN.watch()
        eventN.get((err,logs)=>{
          if(err){
            eventN.stopWatching()
              return reject(err)
            }
          for(let log of logs){
            if(log.event==eventName){
              eventN.stopWatching()
              return resolve(log)
            }
          }
        eventN.stopWatching()
        return resolve(null)
        })
        eventN.stopWatching()
        // return resolve()
      })
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

        // Deploy Dispatch
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('DISPATCH', this.currentTest.dispatch.address);

        // Hack for making arbiter an account we control for testing the escrow
        // await this.currentTest.coord.addImmutableContract('ARBITER', accounts[3]);

        await this.currentTest.coord.updateAllDependencies({ from: owner });

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("BTC CONTEST - lifecycle", async function () {
        const startPrice = 8000
        const upEndpoint = "BTC_UP"
        const downEndpoint = "BTC_DOWN"
        let factory = await SampleContest.new(this.test.coord.address, this.test.tokenFactory.address, publicKey, title);
        await this.test.registry.initiateProvider(111,"coincaptitle",{from:coincap});
        await this.test.registry.initiateProviderCurve("coincapendpoint",piecewiseFunction,zeroAddress,{from:coincap});

	let tx;//tmp var for event tracking

	let ttl = 10;//10 blocks contest period

	await factory.initializeCurve(upEndpoint,upEndpoint, piecewiseFunction);
	await factory.initializeCurve(downEndpoint,downEndpoint, piecewiseFunction);
  let btcContest = await BTCcontest.new(this.test.coord.address,factory.address, startPrice, upEndpoint, downEndpoint);
        let reserveTokenAddr = await factory.reserveToken();
        let reserveToken = await ZapToken.at(reserveTokenAddr);
        await reserveToken.allocate(owner, tokensForOwner);
        await reserveToken.allocate(participant1, tokensForOwner, {from: owner});
        await reserveToken.allocate(participant2, tokensForOwner, {from: owner});
        await reserveToken.allocate(btcContest.address, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: owner});
        await reserveToken.approve(factory.address, tokensForOwner, {from: participant1});
        await reserveToken.approve(factory.address, tokensForOwner, {from: participant2});
        await btcContest.bondToCoincap(coincap,"coincapendpoint",3,{from:owner})
	let zapBalance = await reserveToken.balanceOf(owner);
	let zapAllowance = await reserveToken.allowance(owner, factory.address);
	await factory.initializeContest(btcContest.address, ttl, {from: owner});

        let curveTokenAddr = await factory.getTokenAddress(upEndpoint);
        let curveToken = await FactoryToken.at(curveTokenAddr);
        let upcurveTokenAddr = await factory.getTokenAddress(upEndpoint);
        let upcurveToken = await FactoryToken.at(upcurveTokenAddr);
        let downcurveTokenAddr = await factory.getTokenAddress(downEndpoint);
        let downcurveToken = await FactoryToken.at(downcurveTokenAddr);

        //Before the contest
        let part1Balance = await upcurveToken.balanceOf(participant1);
        let part1ZapBalance = await reserveToken.balanceOf(participant1)
        let part2Balance = await downcurveToken.balanceOf(participant2);
        let part2ZapBalance = await reserveToken.balanceOf(participant2)
        console.log("parts token balance before settle : participant1", part1Balance.toNumber(),"participant2", part2Balance.toNumber())
        console.log("sampleContest zap balance before settle : ",(await reserveToken.balanceOf(factory.address)).toNumber())


	await factory.bond(upEndpoint, 7, {from: participant1});
	await factory.bond(downEndpoint, 8, {from: participant2});



  let txquery =await  btcContest.queryToSettle(coincap,"coincapendpoint",{from:owner})
  let queryEvent = await findEvent(this.test.dispatch,"Incoming");
  if(queryEvent && queryEvent.args && queryEvent.args.id){
    let query_id = queryEvent.args.id
    const tx2 = await this.test.dispatch.respondIntArray(query_id,[9000],{from:coincap})
    const tx3 = await factory.settle({from:owner});
    console.log("sampleContest zap balance after settled", (await reserveToken.balanceOf(factory.address)).toNumber())
    const status = await factory.status()
    status.toNumber().should.equal(3)

    //unbond to claim winning
    let approveToBurn = await upcurveToken.approve(factory.address,7,{from:participant1})
    let unbondTx = await factory.unbond(upEndpoint,7,{from:participant1})



    //AFter the contest
    let part1CurveTokenDelta = (await upcurveToken.balanceOf(participant1)).toNumber() - part1Balance.toNumber()
    let part1ZapBalanceDelta = (await reserveToken.balanceOf(participant1)).toNumber()-part1ZapBalance.toNumber()
    let part2CurveTokenDelta = (await downcurveToken.balanceOf(participant2)).toNumber() - part2Balance.toNumber()
    let part2ZapBalanceDelta = (await reserveToken.balanceOf(participant2)).toNumber() - part2ZapBalance.toNumber()
    console.log("Curve Token Delta after settle : participant1", part1CurveTokenDelta, "participant2",part2CurveTokenDelta)
    console.log("Zap token delta after settle : partticipant1",part1ZapBalanceDelta,"participant2",part2ZapBalanceDelta)
    part1CurveTokenDelta.should.equal(0)
    part2CurveTokenDelta.should.equal(8)
    part1ZapBalanceDelta.should.equal(-part2ZapBalanceDelta)
  }
  else{
    console.log("NO query event found")
  }
    });
});
