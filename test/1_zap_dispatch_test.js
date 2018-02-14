const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

var Utils = require("./helpers/utils.js");

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


const CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

var showReceivedEvents = (res) => {
    for (var i = 0; i < res.logs.length; i++) {
        var log = res.logs[i];
        console.log(log.event + ", args:");
        for (var j in log.args) {
            let arg = log.args[j];
            console.log("        " + j + " = " + arg.valueOf());
        }
    }
};

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


    it("ZAP_DISPATCH_1 - Check bondage address setuping", async function () {
        let zapDispatch = await deployZapDispatch();

        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapDispatch.setBondageAddress(zapBondage.address);

        const res = await zapDispatch.bondageAddress.call();
        res.valueOf().should.be.equal(zapBondage.address);
    });

    it("ZAP_DISPATCH_2 - Check bondage address can not be reseted", async function () {
        let zapDispatch = await deployZapDispatch();

        let zapToken = await deployZapToken();
        let zapRegistry = await deployZapRegistry();
        let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

        await zapDispatch.setBondageAddress(zapBondage.address);
        await zapDispatch.setBondageAddress(zapRegistry.address);

        const res = await zapDispatch.bondageAddress.call();
        res.valueOf().should.be.equal(zapBondage.address);
    });

    it("ZAP_DISPATCH_3 - Check query function", async function () {
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
        dispatchEvents.watch((err, res) => {
            if (res.event == "Incoming") {
                console.log("Query perfomed!");
            } else if (res.event == "QueryPerformError") {
                console.log("ERROR WHILE PERFORMING QUERY!");
                assert(false);
            }
        });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 2, { from: owner });

        // SUBSCRIBE SUBSCRIBEER TO RECIVE DATA FROM PROVIDER
        const res = await subscriberContract.queryTest(provider, query, { from: owner });       
    });

    it("ZAP_DISPATCH_4 - Check query function will not performed if subscriber will not have enough dots", async function () {
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
        dispatchEvents.watch((err, res) => {
            if (res.event == "Incoming") {
                console.log("Query perfomed!");
            } else if (res.event == "QueryPerformError") {
                console.log("ERROR WHILE PERFORMING QUERY!");
            }
        });
        const subEvents = subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subEvents.watch((err, res) => {
            if (res.event == "Incoming") {
                console.log("Query perfomed!");
            } else if (res.event == "QueryPerformError") {
                console.log("ERROR WHILE PERFORMING QUERY!");
            }
        });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 0, { from: owner });

        const res = await zapBondage._getDots(specifier.valueOf(), subscriberContract.address, provider);
        console.log(res);

        // SUBSCRIBE SUBSCRIBEER TO RECIVE DATA FROM PROVIDER
        await subscriberContract.queryTest(provider, query, { from: owner });       
    });

    it("ZAP_DISPATCH_5 - Check query function will not performed if subscriber was not bond provider", async function () {
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
        dispatchEvents.watch((err, res) => {
            if (res.event == "Incoming") {
                console.log("Query perfomed!");
            } else if (res.event == "QueryPerformError") {
                console.log("ERROR WHILE PERFORMING QUERY!");
            }
        });

        const subEvents = subscriberContract.allEvents({ fromBlock: 0, toBlock: 'latest' });
        subEvents.watch((err, res) => {
            if (res.event == "Incoming") {
                console.log("Query perfomed!");
            } else if (res.event == "QueryPerformError") {
                console.log("ERROR WHILE PERFORMING QUERY!");
            }
        });

        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        //await subscriberContract.bondToOracle(provider, 0, { from: owner });

        // SUBSCRIBE SUBSCRIBEER TO RECIVE DATA FROM PROVIDER
        const res = await subscriberContract.queryTest(provider, query, { from: owner });  
    });

    it("ZAP_DISPATCH_6 - Respond check", async function () {
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


        // BONDING OUR SUBSCRIBER WITH DATA PROVIDER
        await subscriberContract.bondToOracle(provider, 10, { from: owner });

        // SUBSCRIBE SUBSCRIBEER TO RECIVE DATA FROM PROVIDER
        const res = await subscriberContract.queryTest(provider, query, { from: owner });  
    });
});