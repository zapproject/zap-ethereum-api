const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

import EVMRevert from './helpers/EVMRevert';

const ZapDispatch = artifacts.require("TestZapDispatch");
const ZapBondage = artifacts.require("ZapBondage");
const ZapToken = artifacts.require("ZapToken");
const ZapRegistry = artifacts.require("ZapRegistry");
const Subscriber = artifacts.require("TestSubscriber");


const deployZapDispatch = () => {
    return ZapDispatch.new();
};

const deployZapToken = () => {
    return ZapToken.new();
};

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const deployZapBondage = (tokenAddress, registryAddress) => {
    return ZapBondage.new(tokenAddress, registryAddress);
};

const deploySubscriber = (tokenAddress, dispatchAddress, bondageAddress) => {
    return Subscriber.new(tokenAddress, dispatchAddress, bondageAddress);
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


const CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
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

    const query = "Hello!";


    it("ZAP_DISPATCH_1 - setBondageAddress() - Check bondage address setuping", async function () {
        let zapDispatch = await deployZapDispatch();

        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapDispatch.setBondageAddress(zapBondage.address);

        const res = await zapDispatch.bondageAddress.call();
        expect(res.valueOf()).to.be.equal(zapBondage.address);
    });

    it("ZAP_DISPATCH_2 - setBondageAddress() - Check bondage address can not be reseted", async function () {
        let zapDispatch = await deployZapDispatch();

        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapDispatch.setBondageAddress(zapBondage.address);
        await zapDispatch.setBondageAddress(zapRegistry.address);

        const res = await zapDispatch.bondageAddress.call();
        expect(res.valueOf()).to.be.equal(zapBondage.address);
    });

    it("ZAP_DISPATCH_3 - query() - Check query function", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, {from: provider});
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, {from: provider});

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 2, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });   
    });

    it("ZAP_DISPATCH_4 - query() - Check query function will not performed if subscriber will not have enough dots", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, {from: provider});
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, {from: provider});

        // START WATCHIG EVENTS
        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 0, { from: owner });
    
        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner }); 

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_5 - query() - Check query function will not performed if subscriber was not bond provider", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        //await subscriberContract.bondToOracle(provider, 0, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_6 - query() - Check query function will not performed if subscriber don't have enough zap", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        //await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => {});

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 100, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        const logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "QueryPerformError")).to.be.equal(true);

        // STOP WATCHING EVENTS
        dispatchEvents.stopWatching();
    });

    it("ZAP_DISPATCH_7 - respond1() - Respond check", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.respond1(data.id, "pum-tum-pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result1")).to.be.equal(true);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_8 - respond1() - Respond will throw error if it was called not from provider address", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(zapDispatch.respond1(data.id, "pum-tum-pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_9 - respond2() - Respond check", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.respond2(data.id, "pum-tum-pum", "hi", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result2")).to.be.equal(true);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_10 - respond2() - Respond will throw error if it was called not from provider address", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(zapDispatch.respond2(data.id, "pum-tum-pum", "hi", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_11 - respond3() - Respond check", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.respond3(data.id, "pum", "tum", "pum", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result3")).to.be.equal(true);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_12 - respond3() - Respond will throw error if it was called not from provider address", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(zapDispatch.respond3(data.id, "pum", "tum", "pum", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });


    it("ZAP_DISPATCH_13 - respond4() - Respond check", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.respond4(data.id, "1", "2", "4", "8", { from: provider })

        logs = await subscriberEvents.get();
        expect(isEventReceived(logs, "Result4")).to.be.equal(true);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_14 - respond4() - Respond will throw error if it was called not from provider address", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        expect(zapDispatch.respond4(data.id, "1", "2", "4", "8", { from: owner })).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_15 - fulfillQuery() - Check that query can be fulfilled", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.fulfillQuery(data.id);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });

    it("ZAP_DISPATCH_16 - fulfillQuery() - Check that fulfilled query can not be fulfilled anymore", async function () {
        let zapDispatch = await deployZapDispatch();
        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);
        let subscriberContract = await deploySubscriber(zapToken.address, zapDispatch.address, zapBondage.address);

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        // TOKEN ALLOCATION
        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(provider, tokensForProvider, { from: owner });
        await zapToken.allocate(subscriberContract.address, tokensForSubscriber, { from: owner });

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, { from: provider });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, { from: provider });

        const dispatchEvents = zapDispatch.allEvents({ fromBlock: 0, toBlock: 'latest' });
        dispatchEvents.watch((err, res) => { });
        const subscriberEvents= subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subscriberEvents.watch((err, res) => { });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });

        // GET ALL EVENTS LOG 
        let logs = await dispatchEvents.get();
        expect(isEventReceived(logs, "Incoming")).to.be.equal(true);

        const data = getParamsFromIncomingEvent(logs);
        await zapDispatch.fulfillQuery(data.id);

        const q = await zapDispatch.queries.call(data.id, { from: owner });
        expect(parseInt(q[3].valueOf())).to.be.equal(1);

        expect(zapDispatch.fulfillQuery(data.id)).to.eventually.be.rejectedWith(EVMRevert);

        // STOP WATCHING EVENTS 
        dispatchEvents.stopWatching();
        subscriberEvents.stopWatching();
    });
});