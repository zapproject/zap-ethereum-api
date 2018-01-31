const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const ZapRegistry = artifacts.require("ZapRegistry");

import EVMRevert from './helpers/EVMRevert';
import expectThrow from './helpers/expectThrow';

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const curveTypes = {
    "None": 0,
    "Linier": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

contract('ZapRegistry', function (accounts) {
    const owner = accounts[0];

    it("ZAP_REGISTRY_1 - Check that we can initiate provider", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });
    });

    it("ZAP_REGISTRY_2 - Check that we can't change provider info if it was initatedr", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        
        const newPublicKey = 222;
        const newTitle = "test-test"

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        await zapRegistry.initiateProvider(newPublicKey, [1], newTitle, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);
        const receivedPublickKey = await zapRegistry.getProviderPublicKey.call(owner);
        receivedTitle.should.be.equal(title);
        receivedPublickKey.should.be.equal(publicKey);
    });

    it("ZAP_REGISTRY_3 - Check that we can initiate provider curve", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner });
    });

    it("ZAP_REGISTRY_4 - Check that we can't initiate provider curve if provider wasn't intiated", async function () {
        let zapRegistry = await deployZapRegistry();

        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;

      //  (await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner })).should.be.rejectedWith(EVMRevert);
        expectThrow(
            zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner })
        );
    });

    it("ZAP_REGISTRY_5 - Check that we can't initiate provider curve if curve type is none", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["None"];
        const start = 1;
        const mul = 2;

        await zapRegistry.initiateProvider(publicKey, [1], title, { from: owner });

        //  (await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner })).should.be.rejectedWith(EVMRevert);
        expectThrow(
            zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner })
        );
    });

    it("ZAP_REGISTRY_6 - Check that we can get provider route keys", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedRouteKeys = await zapRegistry.getProviderRouteKeys.call(owner);

        assert.equal(receivedRouteKeys, routeKeys);
    });

    it("ZAP_REGISTRY_7 - Check that we can't get route keys of provider that doesn't exists", async function () {
        let zapRegistry = await deployZapRegistry();
        
        expectThrow(
            zapRegistry.getProviderRouteKeys.call(owner)
        );
    });

    it("ZAP_REGISTRY_8 - Check that we can get provider title", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedTitle = await zapRegistry.getProviderTitle.call(owner);

        assert.equal(receivedTitle, title);
    });

    it("ZAP_REGISTRY_9 - Check that we can't get title of provider that doesn't exists", async function () {
        let zapRegistry = await deployZapRegistry();
        
        expectThrow(
            zapRegistry.getProviderTitle.call(owner)
        );
    });

    it("ZAP_REGISTRY_10 - Check that we can get provider public key", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test";
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        const receivedPublicKey = await zapRegistry.getProviderPublicKey.call(owner);

        assert.equal(receivedPublicKey, publicKey);
    });

    it("ZAP_REGISTRY_11 - Check that we can't get public key of provider that doesn't exists", async function () {
        let zapRegistry = await deployZapRegistry();
        
       
        zapRegistry.getProviderPublicKey.call(owner).should.be.rejected
    });

    it("ZAP_REGISTRY_12 - Check that we can get provider curve", async function () {
        let zapRegistry = await deployZapRegistry();

        const publicKey = 111;
        const title = "test"; 
        const specifier = new String("test-liner-specifier");
        const curve = curveTypes["Linier"];
        const start = 1;
        const mul = 2;
        const routeKeys = [1];

        await zapRegistry.initiateProvider(publicKey, routeKeys, title, { from: owner });

        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curve, start, mul, { from: owner });

        const res = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf());

        assert.equal(res[0].valueOf(), curve);
        assert.equal(res[1].valueOf(), start);
        assert.equal(res[2].valueOf(), mul);
    });

});