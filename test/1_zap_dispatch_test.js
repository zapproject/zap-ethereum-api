const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

import EVMRevert from './helpers/EVMRevert';

const Utils = require("./helpers/utils");

const ZapDispatch = artifacts.require("TestZapDispatch");
const ZapBondage = artifacts.require("ZapBondage");
const ZapToken = artifacts.require("ZapToken");
const ZapRegistry = artifacts.require("ZapRegistry");
const Subscriber = artifacts.require("TestSubscriber");
const ProxyDispatcher = artifacts.require("ProxyDispatcher");
const ProxyDispatcherStorage = artifacts.require("ProxyDispatcherStorage");
const FunctionsLib = artifacts.require("FunctionsLib");

var replaceAddr = '1111222233334444555566667777888899990000';

const deployLib = () => {
    return FunctionsLib.new();
}

const deployDispatcherStorage = (libAddr) => {
    return ProxyDispatcherStorage.new(libAddr)
}

const deployDispatcher = (dispatcherStorage) => {
    ProxyDispatcher.unlinked_binary = ProxyDispatcher.unlinked_binary.replace(replaceAddr, dispatcherStorage.address.slice(2));
    replaceAddr = dispatcherStorage.address.slice(2);
    return ProxyDispatcher.new()
}

const deployZapRegistry = (dispatcherAddress) => {
    ZapRegistry.link('LibInterface', dispatcherAddress);
    return ZapRegistry.new();
};

const deployZapDispatch = () => {
    return ZapDispatch.new();
};

const deployZapToken = () => {
    return ZapToken.new();
};

const deployZapBondage = (tokenAddress, registryAddress, dispatcherAddress) => {
    ZapBondage.link('LibInterface', dispatcherAddress);
    return ZapBondage.new(tokenAddress, registryAddress);
};

const deploySubscriber = (tokenAddress, dispatchAddress, bondageAddress) => {
    return Subscriber.new(tokenAddress, dispatchAddress, bondageAddress);
};

const deployFunctions = (registryAddress) => {
    return Functions.new(registryAddress);
};


function fetchPureArray(res, parseFunc) {
    let arr = [];
    for (let key in res) {
        arr.push(parseFunc(res[key].valueOf()));
    }
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


contract('ZapDispatch', function (accounts) {
    const owner = accounts[0];
    const provider = accounts[1];
    const subscriber = accounts[2];


    const tokensForOwner = new BigNumber("1500e18");
    const tokensForProvider = new BigNumber("2000e18");
    const tokensForSubscriber = new BigNumber("2000e18");
    const approveTokens = new BigNumber("1000e18");


    const specifier = new String("spec01");
    const publicKey = 10001;
    const title = "tst";
    const extInfo = [111, 222, 333];

    const curveStart = 1;
    const curveMultiplier = 2;
    const curveLinear = Utils.CurveTypes["Linear"];

    const query = "Hello!";

    beforeEach(async function deployContracts() {
        this.currentTest.functionsLib = await deployLib();
        this.currentTest.storage = await deployDispatcherStorage(this.currentTest.functionsLib.address);
        this.currentTest.dispatcher = await deployDispatcher(this.currentTest.storage);
        this.currentTest.zapRegistry = await deployZapRegistry(this.currentTest.dispatcher.address);
        this.currentTest.zapToken = await deployZapToken();
        this.currentTest.zapBondage = await deployZapBondage(this.currentTest.zapToken.address, this.currentTest.zapRegistry.address, this.currentTest.dispatcher.address);
        this.currentTest.zapDispatch = await deployZapDispatch();
        this.currentTest.subscriberContract = await deploySubscriber(this.currentTest.zapToken.address, this.currentTest.zapDispatch.address, this.currentTest.zapBondage.address);
    });

    it("ZAP_DISPATCH_1 - setBondageAddress() - Check bondage address setuping", async function () {
        await this.test.zapDispatch.setBondageAddress(this.test.zapBondage.address);

        const res = await this.test.zapDispatch.bondageAddress.call();
        expect(res.valueOf()).to.be.equal(this.test.zapBondage.address);
    });

    it("ZAP_DISPATCH_2 - setBondageAddress() - Check bondage address can not be reseted", async function () {
        await this.test.zapDispatch.setBondageAddress(this.test.zapBondage.address);
        await this.test.zapDispatch.setBondageAddress(this.test.zapRegistry.address);

        const res = await this.test.zapDispatch.bondageAddress.call();
        expect(res.valueOf()).to.be.equal(this.test.zapBondage.address);
    });

    it("ZAP_DISPATCH_3 - query() - Check query function", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, {from: provider});
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, {from: provider});

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});
        
        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 2, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });   

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_4 - query() - Check query function will not performed if subscriber will not have enough dots", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, {from: provider});
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, {from: provider});

        // START WATCHIG EVENTS
        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 0, { from: owner });
    
        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner }); 

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_5 - query() - Check query function will not performed if subscriber was not bond provider", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        //await subscriberContract.bondToOracle(provider, 0, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_6 - query() - Check query function will not performed if subscriber don't have enough zap", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        //await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 100, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_7 - respond1() - Respond check", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.respond1(data.id, "pum-tum-pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_8 - respond1() - Respond will throw error if it was called not from provider address", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(this.test.zapDispatch.respond1(data.id, "pum-tum-pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_9 - respond2() - Respond check", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.respond2(data.id, "pum-tum-pum", "hi", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result2")).to.be.equal(true);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_10 - respond2() - Respond will throw error if it was called not from provider address", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });
        

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(this.test.zapDispatch.respond2(data.id, "pum-tum-pum", "hi", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_11 - respond3() - Respond check", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.respond3(data.id, "pum", "tum", "pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result3")).to.be.equal(true);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_12 - respond3() - Respond will throw error if it was called not from provider address", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(this.test.zapDispatch.respond3(data.id, "pum", "tum", "pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
    });


    it("ZAP_DISPATCH_13 - respond4() - Respond check", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents = this.test.subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.respond4(data.id, "1", "2", "4", "8", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result4")).to.be.equal(true);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_14 - respond4() - Respond will throw error if it was called not from provider address", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(this.test.zapDispatch.respond4(data.id, "1", "2", "4", "8", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_15 - fulfillQuery() - Check that query can be fulfilled", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.fulfillQuery(data.id);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_16 - fulfillQuery() - Check that fulfilled query can not be fulfilled anymore", async function () {
        await this.test.zapDispatch.setBondageAddress.sendTransaction(this.test.zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(provider, tokensForProvider, { from: owner });
        await this.test.zapToken.allocate(this.test.subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await this.test.zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: provider });
        await this.test.zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = this.test.zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await this.test.subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await this.test.subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await this.test.zapDispatch.fulfillQuery(data.id);

        const q = await this.test.zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        expect(this.test.zapDispatch.fulfillQuery(data.id)).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
    });
}); 