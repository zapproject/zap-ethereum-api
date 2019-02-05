// import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require("./helpers/utils");
const EVMRevert = require("./helpers/EVMRevert");

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Dispatch = artifacts.require("Dispatch");
const Bondage = artifacts.require("Bondage");
const Registry = artifacts.require("Registry");
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

function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
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
    const provider = accounts[2];

    const tokensForOwner = new BigNumber("5000e18");
    const tokensForSubscriber = new BigNumber("3000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const params = ["param1", "param2"];

    const spec1 = "Hello?";
    const spec2 = "Reverse";
    const spec3 = "Add";
    const spec4 = "Double";


    const publicKey = 10001;
    const title = "tst";
    const extInfo = [111, 222, 333];

    const query = "query";


    async function prepareTokens(allocAddress = subscriber) {
        await this.token.allocate(owner, tokensForOwner, { from: owner });
        await this.token.allocate(allocAddress, tokensForSubscriber, { from: owner });
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

        // Deploy dependent contracts
        this.currentTest.registry = await Registry.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('REGISTRY', this.currentTest.registry.address);

        this.currentTest.cost = await Cost.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('CURRENT_COST', this.currentTest.cost.address);

        this.currentTest.bondage = await Bondage.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('BONDAGE', this.currentTest.bondage.address);

        // Deploy Dispatch contract
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.coord.address);
        await this.currentTest.coord.updateContract('DISPATCH', this.currentTest.dispatch.address);

        await this.currentTest.coord.updateAllDependencies();

        this.currentTest.subscriber = await Subscriber.new(
            this.currentTest.token.address,
            this.currentTest.dispatch.address,
            this.currentTest.bondage.address,
            this.currentTest.registry.address
        );

        this.currentTest.oracle = await Oracle.new(this.currentTest.registry.address, false);
    });

    it("DISPATCH_1 - respond1() - Check that we can make a simple query", async function () {
        await prepareTokens.call(this.test, subscriber);

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        // watch events
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => {});

        // holder: subAddr (holder of dots)
        // subscriber: owner of zap
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 10, {from: subscriber});

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriber.testQuery(oracleAddr, query, spec1, params);

        // GET ALL EVENTS LOG
        const logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        // subscriber should have emitted one event
        const result = logs[0].args["response1"];
        await expect(result).to.be.equal("Hello World");

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_2 - query() - Check query function will not be performed if subscriber will not have enough dots", async function () {
        await prepareTokens.call(this.test, subscriber);

        var oracleAddr = this.test.oracle.address;

        await expect(this.test.subscriber.testQuery(oracleAddr, query, spec1, params)).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("DISPATCH_3 - query() - Check query function will not be performed if msg.sender is not subscriber", async function () {
        await prepareTokens.call(this.test, subscriber);

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 1, {from: subscriber});

        await expect(this.test.dispatch.query(oracleAddr, query, spec1, params, {from: accounts[4]})).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("DISPATCH_4 - query() - Check that our contract will revert with an invalid endpoint", async function () {
        await prepareTokens.call(this.test, subscriber);

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 1, {from: subscriber});

        await expect(this.test.subscriber.testQuery(oracleAddr, query, "Bad Endpoint", params)).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("DISPATCH_5 - query() - Check that our test contract can bond and make queries to different endpoints", async function () {
        await prepareTokens.call(this.test, subscriber);

        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        // Bond to endpoints 1-3
        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec2, 100, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec3, 100, {from: subscriber});

        // Make three separate queries
        await this.test.subscriber.testQuery(oracleAddr, query, spec1, params);
        let logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);
        var result = logs[0].args["response1"];
        await expect(result == "Hello World");

        await this.test.subscriber.testQuery(oracleAddr, "test", spec2, params);
        logs = await subscriberEvents.get();
        result = logs[1].args["response1"];
        await expect(result == "tset");

        // STOP WATCHING EVENTS
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_6 - Check that dispatch will revert if subscriber is subscribed to a different endpoint", async function () {
        await prepareTokens.call(this.test, subscriber);

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 100, {from: subscriber});

        await expect(this.test.subscriber.testQuery(oracleAddr, query, spec2, params)).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("DISPATCH_7 - query() - Check that the test oracle can access the given endpoint parameters and use respondBytes32Array", async function () {
        await prepareTokens.call(this.test, subscriber);

        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec3, 100, {from: subscriber});

        let params3 = [toHex(1), toHex(2), toHex(3)];

        await this.test.subscriber.testQuery(oracleAddr, query, spec3, params3);

        let logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);
        var result = logs[0].args["response1"];
        var sum = web3.toDecimal(result);

        await expect(sum).to.be.equal(6);
    });

    it("DISPATCH_8 - Dispatch will revert if query has already been fulfilled", async function () {
        await prepareTokens.call(this.test, subscriber);

        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec1, 100, {from: subscriber});

        await this.test.subscriber.testQuery(oracleAddr, query, spec1, params);

        let logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        // get id from the Result1 event
        var id = new BigNumber(logs[0].args["id"]);

        // call respond() on already fulfilled query
        await expect(this.test.dispatch.respond1(id, "Bad Data")).to.be.eventually.rejectedWith(EVMRevert);
    });

    it("DISPATCH_9 - respond2() - Check that we can receive two return values", async function () {
        await prepareTokens.call(this.test, subscriber);

        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec4, 100, {from: subscriber});
        await this.test.subscriber.testQuery(oracleAddr, query, spec4, params);

        let logs = await subscriberEvents.get();
        await expect(isEventReceived(logs, "Result2")).to.be.equal(true);

        // subscriber should have emitted one event
        var r1 = logs[0].args["response1"];
        var r2 = logs[0].args["response2"];

        await expect(r1).to.be.equal("Hello");
        await expect(r2).to.be.equal("World");
        var id = new BigNumber(logs[0].args["id"]);

        await expect(this.test.dispatch.respond1(id, "Bad Data")).to.be.eventually.rejectedWith(EVMRevert);
    });


    it("DISPATCH_10 - cancelQuery() - Check that a subscriber can cancel a query", async function () {
        // make a "bad" oracle (will never respond)
        this.test.oracle = await Oracle.new(this.test.registry.address, true);

        await prepareTokens.call(this.test, subscriber);

        const subscriberEvents = this.test.subscriber.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });


        var oracleAddr = this.test.oracle.address;
        var subAddr = this.test.subscriber.address;

        await this.test.token.approve(this.test.bondage.address, approveTokens, {from: subscriber});
        await this.test.bondage.delegateBond(subAddr, oracleAddr, spec4, 100, {from: subscriber});

        var dotBalance = await this.test.bondage.getBoundDots(this.test.subscriber.address, oracleAddr, spec4);
        // make the query
        await this.test.subscriber.testQuery(oracleAddr, query, spec4, params);
        var s_logs = await subscriberEvents.get();
        var queryId = s_logs[0].args["id"];
        var postQueryDots = await this.test.bondage.getBoundDots(this.test.subscriber.address, oracleAddr, spec4);

        // expect to have escrowed a dot
        dotBalance.minus(postQueryDots).should.be.bignumber.equal(web3.toBigNumber(1));

        await this.test.subscriber.cancelQuery(queryId);

        let d_logs = await dispatchEvents.get();
        var newBalance = await this.test.bondage.getBoundDots(this.test.subscriber.address, oracleAddr, spec4);

        expect(d_logs[0].event).to.be.equal("CanceledRequest");
        // expect escrowed dot to be returned
        dotBalance.should.be.bignumber.equal(newBalance);
    });

    // converts an integer to its 32-bit hex representation
    function toHex(num){
        var hex = web3.toHex(num).substring(2);
          while (hex.length < 64) hex = "0" + hex;
        hex = "0x" + hex;
        return hex;
    }
});
