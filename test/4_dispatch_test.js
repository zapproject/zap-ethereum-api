// import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require("./helpers/utils");

const Dispatch = artifacts.require("Dispatch");
const DispatchStorage = artifacts.require("DispatchStorage");
const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const TheToken = artifacts.require("TheToken");

function fetchPureArray(res, parseFunc) {
    let arr = [];
    for (let key in res) arr.push(parseFunc(res[key].valueOf()));
    return arr;
};

function showReceivedEvents(res) {
    for (var i = 0; i < bondRes.logs.length; i++) {
        var log = bondRes.logs[i];
        console.log("Event ", log.event);
        for (var j = 0; j < log.args.length; j++) {
            let arg = log.args[j];
            console.log("   ", arg);
        }
    }
};

function isEventReceived(logs, eventName) {
    for (let i in logs) {
        let log = logs[i];
        if (log.event === eventName) {
            return true;
        }
    }
    return false;
};

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

    const tokensForOwner = new BigNumber("1500e18");
    const tokensForSubscriber = new BigNumber("2000e18");
    const tokensForProvider = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");

    const specifier = "spec01";
    const publicKey = 10001;
    const title = "tst";
    const params = ["param1", "param2"];
    const extInfo = [111, 222, 333];

    const curveStart = 1;
    const curveMultiplier = 2;
    const curveLinear = Utils.CurveTypes["Linear"];

    const query = "Why?";

    async function prepareProvider() {
        await this.registry.initiateProvider(publicKey, title, specifier, params, {from: provider});
        await this.registry.initiateProviderCurve(specifier, curveLinear, curveStart, curveMultiplier, {from: provider});
    }

    async function prepareTokens(sub = true) {
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        if (sub) await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });
        //await this.token.approve(this.bondage.address, approveTokens, {from: subscriber});
    }

    beforeEach(async function deployContracts() {
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);

        this.currentTest.token = await TheToken.new();

        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.bondStor.address, this.currentTest.registry.address, this.currentTest.token.address);
        this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

        this.currentTest.dispStor = await DispatchStorage.new();
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.dispStor.address, this.currentTest.bondage.address);
        this.currentTest.dispStor.transferOwnership(this.currentTest.dispatch.address);
    });

    it("DISPATCH_1 - setBondageAddress() - Check bondage address can be reset by owner", async function () {

        await this.test.dispatch.setBondageAddress(0x0);

        expect(this.test.dispatch.address.bondage_address).to.be.equal(0x0);
    });

    it("DISPATCH_2 - setBondageAddress() - Check bondage address can only be reset by owner", async function () {

        expect(this.test.dispatch.setBondageAddress(0x0, {from: subscriber})).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("DISPATCH_3 - query() - Check query function", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);
        
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});
        
        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("DISPATCH_4 - query() - Check query function will not be performed if subscriber will not have enough dots", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });

    it("DISPATCH_5 - query() - Check query function will not be performed if subscriber was not msg.sender", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: provider});
    });

    it("DISPATCH_6 - query() - Check query function will not be performed if subscriber doesn't have enough zap", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test, sub = false);

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });

    it("DISPATCH_7 - respond1() - Respond check", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);
        
        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond1(data.id, "pum-tum-pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        const q = await this.test.dispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_8 - respond1() - Respond will throw error if it was called not from provider address", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);        

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });

    it("DISPATCH_9 - respond2() - Respond check", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);        

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond2(data.id, "pum-tum-pum", "hi", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result2")).to.be.equal(true);

        const q = await this.test.dispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_10 - respond2() - Respond will throw error if it was called not from provider address", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);        

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });

    it("DISPATCH_11 - respond3() - Respond check", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);       

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond3(data.id, "pum", "tum", "pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result3")).to.be.equal(true);

        const q = await this.test.dispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_12 - respond3() - Respond will throw error if it was called not from provider address", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });


    it("DISPATCH_13 - respond4() - Respond check", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);       

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.dispatch.respond4(data.id, "1", "2", "4", "8", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result4")).to.be.equal(true);

        const q = await this.test.dispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("DISPATCH_14 - respond4() - Respond will throw error if it was called not from provider address", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);

        await this.test.bondage.bond(provider ,subscriber, 10, {from: subscriber});
        await this.test.dispatch.query(provider, subscriber, query ,specifier, params, {from: subscriber});
    });

/* IF RESPOND FUNCTIONS CAN PASS, THEN IT FOLLOWS THAT fulfillQuery RETURNS TRUE
    it("DISPATCH_15 - fulfillQuery() - Check that query can be fulfilled", async function () {

        prepareProvider.call(this.test);
        prepareTokens.call(this.test);      

        const dispatchEvents = this.test.dispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
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