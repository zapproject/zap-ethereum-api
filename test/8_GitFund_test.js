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
const FundingContest = artifacts.require("FundingContest");
const GitFund = artifacts.require("GitFund");

contract('GitFund', function (accounts) {
    // const zapTokenOwner = accounts[0];
    const funder1 = accounts[1];
    const funder2 = accounts[2];
    const zapTokenOwner = accounts[3];
    const factoryOwner = accounts[4];
    const gitOracleOwner = accounts[5]

    const publicKey = 111;
    const title = "test";
    const gitCommitEndpoint = "GitCommitEndpoint"

    const zeroAddress = Utils.ZeroAddress;

    const piecewiseFunction = [1,1000000000000000000, 100000000000000];
    const broker = 0;

    const tokensAllocation = new BigNumber("150000000e18");

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

        await this.currentTest.coord.updateAllDependencies();

        this.currentTest.tokenFactory = await TokenFactory.new();
    });

    it("GIT FUNDING CONTEST - lifecycle", async function () {
        const projectEndpointA = "project_A"
        const projectEndpointB = "project_B"
        let fundingContest = await FundingContest.new(this.test.coord.address, this.test.tokenFactory.address, publicKey, title);
        await this.test.registry.initiateProvider(publicKey,"gitOracleTitle",{from:gitOracleOwner});
        await this.test.registry.initiateProviderCurve(gitCommitEndpoint,piecewiseFunction,zeroAddress,{from:gitOracleOwner});

	let tx;//tmp var for event tracking

	let ttl = 10;//10 blocks contest period

	await fundingContest.initializeCurve(projectEndpointA,projectEndpointA, piecewiseFunction);
	await fundingContest.initializeCurve(projectEndpointB,projectEndpointB, piecewiseFunction);
  let gitFund = await GitFund.new(this.test.coord.address,fundingContest.address);
        await this.test.token.allocate(gitOracleOwner, tokensAllocation);
        await this.test.token.allocate(funder1, tokensAllocation, {from: owner});
        await this.test.token.allocate(funder2, tokensAllocation, {from: owner});
        await this.test.token.approve(factory.address, tokensAllocation, {from: owner});
        await this.test.token.approve(factory.address, tokensAllocation, {from: funder1});
        await this.test.token.approve(factory.address, tokensAllocation, {from: funder2});
        await gitFund.bondToGitOracle(gitOracleOwner,gitCommitEndpoint,3,{from:owner})
	// let zapBalance = await this.test.token.balanceOf(owner);
	// let zapAllowance = await this.test.token.allowance(owner, factory.address);
	      await fundingContest.initializeContest(gitFund.address, ttl, {from: owner});

        let curveTokenAddrA = await fundingContest.getTokenAddress(projectEndpointA);
        let curveTokenB = await FactoryToken.at(upcurveTokenAddr);
        let curveTokenAddrB = await fundingContest.getTokenAddress(projectEndpointB);
        let curveTokenB = await FactoryToken.at(downcurveTokenAddr);

        //Before the contest
        let f1DotBalanceBefore = await upcurveToken.balanceOf(funder1);
        let f1ZapBalanceBefore = await reserveToken.balanceOf(funder1)
        let f2DotBalanceBefore = await downcurveToken.balanceOf(funder2);
        let f2ZapBalanceBefore = await reserveToken.balanceOf(funder2)
        console.log("token dot balance before settle : funder1", f1DotBalanceBefore.toNumber(),"funder2", f2DotBalanceBefore.toNumber())
        console.log("zap balance before settle : funder1", f1ZapBalanceBefore.toNumber(),"funder2", f2ZapBalanceBefore.toNumber())
        // console.log("zap balance before settle : ",(await reserveToken.balanceOf(factory.address)).toNumber())


	await fundingContest.bond(upEndpoint, 7, {from: funder1});
	await fundingContest.bond(downEndpoint, 8, {from: funder2});



  let txquery =await  gitFund.queryToSettle(gitOracleOwner,gitCommitEndpoint,{from:owner})
  let queryEvent = await findEvent(this.test.dispatch,"Incoming");
  if(queryEvent && queryEvent.args && queryEvent.args.id){
    let query_id = queryEvent.args.id
    //respond with winner is project A
    const tx2 = await this.test.dispatch.respond1(query_id,projectEndpointA,{from:gitOracleOwner})
    // after judged, funding contest can now settle
    const tx3 = await fundingContest.settle({from:owner});
    console.log("fundingcontest zap balance after settled", (await reserveToken.balanceOf(fundingContest.address)).toNumber())
    const status = await fundingContest.status()
    status.toNumber().should.equal(3)

    //unbond to claim winning
    let approveToBurn = await curveTokenA.approve(fundingContest.address,7,{from:funder1})
    let unbondTx = await fundingContest.unbond(projectEndpointA,7,{from:funder1})



    //AFter the contest
    let f1DotBalanceDelta = (await curveTokenA.balanceOf(funder1)).toNumber() - f1DotBalanceBefore.toNumber()
    let f1ZapBalanceDelta = (await this.test.token.balanceOf(funder1)).toNumber()-f1ZapBalanceBefore.toNumber()
    let f2DotBalanceDelta = (await curveTokenB.balanceOf(funder2)).toNumber() - f2DotBalanceBefore.toNumber()
    let f2ZapBalanceDelta = (await this.test.token.balanceOf(funder2)).toNumber() - f2ZapBalanceBefore.toNumber()
    console.log("Curve Token Delta after settle : funder1", f1DotBalanceDelta, "funder2",f2DotBalanceDelta)
    console.log("Zap token delta after settle : funder1", f1ZapBalanceDelta,"funder2",f2ZapBalanceDelta)
    // part1CurveTokenDelta.should.equal(0)
    // part2CurveTokenDelta.should.equal(8)
    // part1ZapBalanceDelta.should.equal(-part2ZapBalanceDelta)
  }
  else{
    console.log("NO query event found")
  }
    });
});
