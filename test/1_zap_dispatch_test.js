const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Utils = require("./helpers/utils");

const ZapDispatch = artifacts.require("ZapDispatch");
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
        try {
            let zapDispatch = await deployZapDispatch();

            let zapToken = await deployZapToken();
            let zapRegistry = await deployZapRegistry();
            let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

            await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);
        } catch (err) {
            assert(false, err.message);
        }
    });

    it("ZAP_DISPATCH_2 - Check query function", async function () {

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
        await zapToken.approve(zapBondage.address, approveTokens, {from: subscriber});
        await zapToken.approve(zapBondage.address, approveTokens, {from: provider});

        // CREATING DATA PROVIDER
        await zapRegistry.initiateProvider(publicKey, extInfo, title, {from: provider});
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, curveStart, curveMultiplier, {from: provider});

        // BONDING DATA USER WITH DATA PROVIDER
       // await zapBondage.bond(specifier.valueOf(), 10000, provider, { from: subscriber });
        await subscriberContract.bondToOracle(provider, 10000);

        const res = await subscriberContract.queryTest(provider, query);

        // We can loop through result.logs to see if we triggered the Transfer event.
        for (var i = 0; i < res.logs.length; i++) {
            var log = res.logs[i];

            if (log.event == "Incoming") {
                console.log("Query perfomed!");
                break;
            }
        }
    });
});