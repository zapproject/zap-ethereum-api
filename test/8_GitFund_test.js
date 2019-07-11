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
const GitFund = artifacts.require("GitFundContest");

contract('GitFund', function (accounts) {
    const owner = accounts[0];
    const funder1 = accounts[1];
    const funder2 = accounts[2];
    const zapTokenOwner = accounts[3];
    const factoryOwner = accounts[4];
    const gitOracleOwner = accounts[5];
    const beneficiaryA = accounts[6];
    const beneficiaryB = accounts[7];

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

      	await fundingContest.initializeCurve(projectEndpointA,projectEndpointA, piecewiseFunction, beneficiaryA);
      	await fundingContest.initializeCurve(projectEndpointB,projectEndpointB, piecewiseFunction, beneficiaryB);
        console.log("funding contest", fundingContest.address)
        let gitFund = await GitFund.new(this.test.coord.address,fundingContest.address);
        // await this.test.token.allocate(gitOracleOwner, tokensAllocation);
        await this.test.token.allocate(funder1, tokensAllocation, {from: owner});
        await this.test.token.allocate(funder2, tokensAllocation, {from: owner});
        await this.test.token.allocate(gitFund.address, tokensAllocation, {from: owner});// gitFund contract has to have token to bond
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: owner});
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: funder1});
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: funder2});
        await gitFund.bondToGitOracle(gitOracleOwner,gitCommitEndpoint,1,{from:owner})

  	    let ttl = 100;//10 blocks contest period
	      await fundingContest.initializeContest(gitFund.address, ttl, {from: owner});

        let curveTokenAddrA = await fundingContest.getTokenAddress(projectEndpointA);
        let curveTokenA = await FactoryToken.at(curveTokenAddrA);
        let curveTokenAddrB = await fundingContest.getTokenAddress(projectEndpointB);
        let curveTokenB = await FactoryToken.at(curveTokenAddrB);

        //Before the contest
        let f1DotBalanceBefore = await curveTokenA.balanceOf(funder1);
        let f1ZapBalanceBefore = await this.test.token.balanceOf(funder1)
        let f2DotBalanceBefore = await curveTokenB.balanceOf(funder2);
        let f2ZapBalanceBefore = await this.test.token.balanceOf(funder2)
        console.log("token dot balance before settle : funder1", f1DotBalanceBefore.toNumber(),"funder2", f2DotBalanceBefore.toNumber())
        console.log("zap balance before settle : funder1", f1ZapBalanceBefore.toNumber(),"funder2", f2ZapBalanceBefore.toNumber())
        // console.log("zap balance before settle : ",(await reserveToken.balanceOf(factory.address)).toNumber())


    	await fundingContest.bond(projectEndpointA, 7, {from: funder1});
    	await fundingContest.bond(projectEndpointB, 8, {from: funder2});



      let txquery =await  gitFund.queryToSettle(gitOracleOwner,gitCommitEndpoint,{from:owner})
      let queryEvent = await findEvent(this.test.dispatch,"Incoming");
      if(queryEvent && queryEvent.args && queryEvent.args.id){
          let query_id = queryEvent.args.id

          //respond with winner is project A
          const tx2 = await this.test.dispatch.respondBytes32Array(query_id,[projectEndpointA],{from:gitOracleOwner})
          console.log("balance",(await this.test.token.balanceOf(fundingContest.address)).toNumber());
          // after judged, funding contest can now settle
          const tx3 = await fundingContest.settle({from:owner});

          console.log("fundingcontest zap balance after settled", (await this.test.token.balanceOf(fundingContest.address)).toNumber())
          const status = await fundingContest.status()
          status.toNumber().should.equal(4)
          console.log("win value",(await fundingContest.winValue()).toNumber())


        //   //unbond to claim winning
          let approveToBurn = await curveTokenA.approve(fundingContest.address,7,{from:funder1})
          let unbondTx = await fundingContest.unbond(projectEndpointA,{from:funder1})

          //AFter the contest
          let f1DotBalanceDelta = (await curveTokenA.balanceOf(funder1)).toNumber() - f1DotBalanceBefore.toNumber()
          let f1ZapBalanceDelta = (await this.test.token.balanceOf(funder1)).toNumber()-f1ZapBalanceBefore.toNumber()
          let f2DotBalanceDelta = (await curveTokenB.balanceOf(funder2)).toNumber() - f2DotBalanceBefore.toNumber()
          let f2ZapBalanceDelta = (await this.test.token.balanceOf(funder2)).toNumber() - f2ZapBalanceBefore.toNumber()
          console.log("Curve Token Delta after settle : funder1", f1DotBalanceDelta, "funder2",f2DotBalanceDelta)
          console.log("Zap token delta after settle : funder1", f1ZapBalanceDelta,"funder2",f2ZapBalanceDelta)
          console.log("beneficiary balance", (await this.test.token.balanceOf(beneficiaryA)).toNumber(), "B", (await this.test.token.balanceOf(beneficiaryB)).toNumber())
          // true.should.equal(false)

      }
      else{
        console.log("NO query event found")
      }
    });
    it("GIT FUNDING CONTEST - expired case", async function () {
        const projectEndpointA = "project_A"
        const projectEndpointB = "project_B"
        let fundingContest = await FundingContest.new(this.test.coord.address, this.test.tokenFactory.address, publicKey, title);
        await this.test.registry.initiateProvider(publicKey,"gitOracleTitle",{from:gitOracleOwner});
        await this.test.registry.initiateProviderCurve(gitCommitEndpoint,piecewiseFunction,zeroAddress,{from:gitOracleOwner});

        let tx;//tmp var for event tracking

        let ttl = 0;//expired right away

        await fundingContest.initializeCurve(projectEndpointA,projectEndpointA, piecewiseFunction, beneficiaryA);
        await fundingContest.initializeCurve(projectEndpointB,projectEndpointB, piecewiseFunction, beneficiaryB);
        console.log("funding contest", fundingContest.address)
        let gitFund = await GitFund.new(this.test.coord.address,fundingContest.address);

        await this.test.token.allocate(funder1, tokensAllocation, {from: owner});
        await this.test.token.allocate(funder2, tokensAllocation, {from: owner});
        await this.test.token.allocate(gitFund.address, tokensAllocation, {from: owner});// gitFund contract has to have token to bond
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: owner});
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: funder1});
        await this.test.token.approve(fundingContest.address, tokensAllocation, {from: funder2});

        await gitFund.bondToGitOracle(gitOracleOwner,gitCommitEndpoint,1,{from:owner})
        await fundingContest.initializeContest(gitFund.address, ttl, {from: owner});

        let curveTokenAddrA = await fundingContest.getTokenAddress(projectEndpointA);
        let curveTokenA = await FactoryToken.at(curveTokenAddrA);
        let curveTokenAddrB = await fundingContest.getTokenAddress(projectEndpointB);
        let curveTokenB = await FactoryToken.at(curveTokenAddrB);

        //Before the contest
        let f1DotBalanceBefore = await curveTokenA.balanceOf(funder1);
        let f1ZapBalanceBefore = await this.test.token.balanceOf(funder1)
        let f2DotBalanceBefore = await curveTokenB.balanceOf(funder2);
        let f2ZapBalanceBefore = await this.test.token.balanceOf(funder2)
        console.log("token dot balance before settle : funder1", f1DotBalanceBefore.toNumber(),"funder2", f2DotBalanceBefore.toNumber())
        console.log("zap balance before settle : funder1", f1ZapBalanceBefore.toNumber(),"funder2", f2ZapBalanceBefore.toNumber())


      await fundingContest.bond(projectEndpointA, 7, {from: funder1});
      await fundingContest.bond(projectEndpointB, 8, {from: funder2});



      let txquery =await  gitFund.queryToSettle(gitOracleOwner,gitCommitEndpoint,{from:owner})
      let queryEvent = await findEvent(this.test.dispatch,"Incoming");
      if(queryEvent && queryEvent.args && queryEvent.args.id){
          let query_id = queryEvent.args.id

          //respond with winner is project A
          const tx2 = await this.test.dispatch.respondBytes32Array(query_id,[projectEndpointA],{from:gitOracleOwner})
          console.log("balance",(await this.test.token.balanceOf(fundingContest.address)).toNumber());
          // after judged, funding contest can now settle
          const tx3 = await fundingContest.settle({from:owner});

          console.log("fundingcontest zap balance after settled", (await this.test.token.balanceOf(fundingContest.address)).toNumber())
          const status = await fundingContest.status()
          status.toNumber().should.equal(2) //status should be Expired
          console.log("win value",(await fundingContest.winValue()).toNumber())


        //   //unbond to claim winning
          let approveToBurnA = await curveTokenA.approve(fundingContest.address,7,{from:funder1})
          let approveToBurnB = await curveTokenB.approve(fundingContest.address,8,{from:funder2})
          let unbondTxA = await fundingContest.unbond(projectEndpointA,{from:funder1})
          let unbondTxB = await fundingContest.unbond(projectEndpointB,{from:funder2})

          //AFter the contest
          let f1DotBalanceDelta = (await curveTokenA.balanceOf(funder1)).toNumber() - f1DotBalanceBefore.toNumber()
          let f1ZapBalanceDelta = (await this.test.token.balanceOf(funder1)).toNumber()-f1ZapBalanceBefore.toNumber()
          let f2DotBalanceDelta = (await curveTokenB.balanceOf(funder2)).toNumber() - f2DotBalanceBefore.toNumber()
          let f2ZapBalanceDelta = (await this.test.token.balanceOf(funder2)).toNumber() - f2ZapBalanceBefore.toNumber()
          console.log("Curve Token Delta after settle : funder1", f1DotBalanceDelta, "funder2",f2DotBalanceDelta)
          console.log("Zap token delta after settle : funder1", f1ZapBalanceDelta,"funder2",f2ZapBalanceDelta)
          f1ZapBalanceDelta.should.equal(0)
          f2ZapBalanceDelta.should.equal(0)
          const beneficiaryABalance = (await this.test.token.balanceOf(beneficiaryA)).toNumber()
          const beneficiaryBBalance = (await this.test.token.balanceOf(beneficiaryB)).toNumber()
          beneficiaryABalance.should.equal(0)
          beneficiaryBBalance.should.equal(0)

          // true.should.equal(false)

      }
      else{
        console.log("NO query event found")
      }
    });
});
