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
const ERCDotFactory = artifacts.require("ERCDotFactory");
const FactoryToken = artifacts.require("FactoryToken");

function getEventFromLogs(logs, eventName){
    for (let i in logs) {
        let log = logs[i];
        if (log.event === eventName) {
            return log.args ;
        }
    }
    return false;
}

contract('ERCDotFactory', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    const oracle = accounts[2];

    const publicKey = 111;
    const title = "test";
    const symbol = "TEST";

    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = "test-specifier";
    const zeroAddress = Utils.ZeroAddress;
    
    const piecewiseFunction = [3, 0, 0, 2, 10000];

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("5000e18");
    const approveTokens = new BigNumber("1000e18");
    const dotBound = new BigNumber("999");

    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
        await this.token.allocate(this.dotFactory.address, tokensForSubscriber, { from: owner });
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

        await this.currentTest.coord.updateAllDependencies({ from: owner });

        //Deploy ERCDotFactory
        this.currentTest.dotFactory = await ERCDotFactory.new(this.currentTest.coord.address);
    });

    it("ERCDOTFACTORY_1 - intializeCurve", async function () {

        await this.test.dotFactory.initializeCurve(publicKey, title, specifier, symbol, piecewiseFunction); 
    });


    it("ERCDOTFACTORY_2 - bond()", async function () {

        let factoryEvents = this.test.dotFactory.allEvents({ fromBlock: 0, toBlock: 'latest' });
        factoryEvents.watch((err, res) => { });

        await prepareTokens.call(this.test);
        await this.test.dotFactory.initializeCurve(publicKey, title, specifier, symbol, piecewiseFunction); 

        let factoryLogs = await factoryEvents.get();
        let tokenAddress= getEventFromLogs(factoryLogs, 'DotTokenCreated').tokenAddress;
        // console.log('tokenAddress: ', tokenAddress);

        let dotToken = await FactoryToken.at(tokenAddress); 
        let dotTokenBalance = await dotToken.balanceOf(owner);
        // console.log('testToken bal: ', balance.toNumber());
    
        await this.test.token.approve(this.test.dotFactory.address, approveTokens, {from: owner});

        await this.test.dotFactory.bond(owner, specifier, 1, {from: owner});
        dotTokenBalance = await dotToken.balanceOf(owner);
        // console.log('testToken bal: ', balance.toNumber());

    });


}); 

