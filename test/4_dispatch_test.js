// import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require("./helpers/utils");
const EVMRevert = require("./helpers/EVMRevert");

const Dispatch = artifacts.require("Dispatch");
const DispatchStorage = artifacts.require("DispatchStorage");
const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const ZapToken = artifacts.require("ZapToken");
const Cost = artifacts.require("CurrentCost");
const Oracle = artifacts.require("TestProvider");
const Subscriber = artifacts.require("TestClient");

// const Subscriber = artifacts.require("Subscriber");

function showReceivedEvents(res) {
    for (let i = 0; i < bondRes.logs.length; i++) {
        let log = bondRes.logs[i];
        console.log("Event ", log.event);
        for (let j = 0; j < log.args.length; j++) {
            let arg = log.args[j];
            console.log("   ", arg);
        }
    }
}

function isEventReceived(logs, eventName) {
    for (let i in logs) {
        let log = logs[i];
        if (log.event === eventName) {
            return true;
        }
    }
    return false;
}

function getParamsFromIncomingEvent(logs) {
    for (let i in logs) {
        let log = logs[i];
        if (log.event === "Incoming") {
            let obj = new Object();
            obj.id = new BigNumber(log.args.id);
            obj.provider = log.args.provider.toString();
            obj.recipient = log.args.recipient.toString();
            obj.query = log.args.query.toString();
            obj.endpoint = log.args.endpoint.toString();
            obj.params = log.args.endpoint_params;

            return obj;
        }
    }
    return false;
}

contract('Dispatch', function (accounts) {
    const owner = accounts[0];
    const subscriber = accounts[1];
    var provider = accounts[2];

    const tokensForOwner = new BigNumber("5000e18");
    const tokensForSubscriber = new BigNumber("3000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const specifier = "spec01";
    const publicKey = 10001;
    const title = "tst";
    const params = ["param1", "param2"];
    const extInfo = [111, 222, 333];

    const piecewiseFunction = { // 2x^2
        constants: [2, 2, 2],
        parts: [0, 1000000000],
        dividers: [1]
    };

    const query = "Why?";

    async function prepareProvider(curveParams = piecewiseFunction, account = provider) {
        await this.registry.initiateProvider(publicKey, title, specifier, params, {from: account});
        await this.registry.initiateProviderCurve(specifier, curveParams.constants, curveParams.parts, curveParams.dividers, { from: account });
    }

    async function prepareTokens(sub = true) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(provider, tokensForProvider, { from: owner });
        if (sub) {
            await this.token.allocate(this.subscriber.address, tokensForSubscriber, { from: owner });
            // bond Zap
            await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
        }
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry. address);

        this.currentTest.token = await ZapToken.new();

        this.currentTest.oracle = await Oracle.new();

        this.currentTest.cost = await Cost.new(this.currentTest.registry.address);

        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

        this.currentTest.dispStor = await DispatchStorage.new();
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.dispStor.address, this.currentTest.bondage.address);
        await this.currentTest.dispStor.transferOwnership(this.currentTest.dispatch.address);

        this.currentTest.subscriber = await Subscriber.new(this.currentTest.token.address, this.currentTest.dispatch.address, this.currentTest.bondage.address);
    });

    it("DISPATCH_1 - query() - Check query function", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
        
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});
        
        await this.test.bondage.bond(provider, specifier, 100, {from: subscriber});
        
        var oracleAddr = this.test.oracle.address;
        await this.test.dispatch.query(oracleAddr, query, specifier, params, true, {from: subscriber});

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("DISPATCH_2 - query() - Check query function will not be performed if subscriber will not have enough dots", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(provider, specifier, 100, {from: subscriber});
        
        var oracleAddr = this.test.oracle.address;
        await this.test.dispatch.query(oracleAddr, query, specifier, params, true, {from: subscriber});

        //DONT THINK THIS IS RIGHT
    });

    it("DISPATCH_3 - query() - Check query function will not be performed if subscriber was not msg.sender", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        await this.test.bondage.bond(provider, specifier, 100, {from: subscriber});
        var oracleAddr = this.test.oracle.address;
        await this.test.dispatch.query(oracleAddr, query, specifier, params, true, {from: accounts[3]}); //should FAIL
    });

    it("DISPATCH_4 - respond1() - Respond check", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);
       
        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });
        const bondageEvents = this.test.bondage.allEvents({ fromBlock: 0, toBlock: 'latest' });
        bondageEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;



        console.log("INITIALIZED");
        // Bond subscriber account with contract
        await this.test.bondage.delegateBond(subAddr, oracleAddr, web3.toHex(specifier), 100, {from: subscriber});

        console.log("BOUNDED");
        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.query(oracleAddr, query, specifier, params, {from: subscriber});


        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        console.log("LOOKING AT LOGS");
        console.log(logs);
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        console.log("GOOD");
        logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);
        console.log("VERY GOOD");

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
        bondageEvents.stopWatching();
    });

/*
    it("DISPATCH_5 - respond1() - Respond will throw error if it was called not from provider address", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);        

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(oracleAddr, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.dispatch.query(oracleAddr, query, specifier, params, true, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);

        await expect(this.test.dispatch.respond1(data.id, "pum-tum-pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_6 - respond2() - Respond check", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);        

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });


        var oracleAddr = this.test.oracle.address;
        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(oracleAddr, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(oracleAddr, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond2(data.id, "pum-tum-pum", "hi", { from: provider });

        logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result2")).to.be.equal(true);

        const q = await this.test.dispStor.getStatus.call(data.id, { from: owner });
        await expect(parseInt(q.valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_7 - respond2() - Respond will throw error if it was called not from provider address", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);        

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(oracleAddr, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(oracleAddr, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);

        await expect(this.test.dispatch.respond2(data.id, "pum-tum-pum", "hi", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
       
        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_8 - respond3() - Respond check", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);    
        
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond3(data.id, "pum", "tum", "pum", { from: provider });

        logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result3")).to.be.equal(true);

        const q = await this.test.dispStor.getStatus.call(data.id, { from: owner });
        await expect(parseInt(q.valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_9 - respond3() - Respond will throw error if it was called not from provider address", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);

        await expect(this.test.dispatch.respond3(data.id, "pum", "tum", "pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


    it("DISPATCH_10 - respond4() - Respond check", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);    
        
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond4(data.id, "1", "2", "4", "8", { from: provider });

        logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result4")).to.be.equal(true);

        const q = await this.test.dispStor.getStatus.call(data.id, { from: owner });
        await expect(parseInt(q.valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_11 - respond4() - Respond will throw error if it was called not from provider address", async function () {

        await prepareProvider.call(this.test);
        await prepareTokens.call(this.test);

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriber.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        await expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);

        await expect(this.test.dispatch.respond4(data.id, "1", "2", "4", "8", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    }); 

/* IF RESPOND FUNCTIONS CAN PASS, THEN IT FOLLOWS THAT fulfillQuery RETURNS TRUE
    it("DISPATCH_15 - fulfillQuery() - Check that query can be fulfilled", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);      

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= this.test.subContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.fulfillQuery(data.id);

        const q = await this.test.dispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    }); 

    it("DISPATCH_16 - fulfillQuery() - Check that fulfilled query can not be fulfilled anymore", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);      

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });
*/
}); 
