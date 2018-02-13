const ZapDispatch = artifacts.require("ZapDispatch");
const ZapBondage = artifacts.require("ZapBondage");
const ZapToken = artifacts.require("ZapToken");
const ZapRegistry = artifacts.require("ZapRegistry");

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

const DECIMALS = 1000000000000000000;

contract('ZapDispatch', function (accounts) {
    const owner = accounts[0];

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

        await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);


        const specifier = new String("test-liner-specifier");
        const endpoint = new String("test-endppoint");
        const param1 = new String("p1");
        const param2 = new String("p2");
        const params = [param1.valueOf(), param2.valueOf()];

        await zapToken.allocate(owner, 1500 * DECIMALS, { from: owner });
        await zapToken.allocate(accounts[1], 100 * DECIMALS, { from: owner });
        await zapToken.approve(zapBondage.address, 1000 * DECIMALS, {from: owner});

        let ownerBalance = await zapToken.balanceOf.call(owner);
        console.log("owner balance before bonding: ", ownerBalance.valueOf() / DECIMALS);

        await zapRegistry.initiateProvider(111, [1], "test", {from: owner});
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), 1, 1, 2, {from: owner});
        let c = await zapRegistry.getProviderCurve.call(owner, specifier.valueOf())
       // console.log("registered curve for provider spevcifier:")
       // console.log(c);

        let dotsAndZap = await zapBondage.calcZap.call(owner, specifier.valueOf(), 10001, {from: owner});
        console.log("dots count for zap tokens: ", dotsAndZap[1].valueOf());
        console.log("number of zap for bonding: ", dotsAndZap[0].valueOf());

        let totalBound = await zapBondage.getZapBound.call(owner, specifier.valueOf());
        console.log("total bound before: ", totalBound.valueOf());

        const res = await zapBondage.bond(specifier.valueOf(), 10001, owner, {from: owner});
        //console.log("bond res code: ", res.valueOf());

        ownerBalance = await zapToken.balanceOf.call(owner);
        console.log("owner balance after bonding: ", ownerBalance.valueOf() / DECIMALS);

        totalBound = await zapBondage.getZapBound.call(owner, specifier.valueOf());
        console.log("total bound after: ", totalBound.valueOf());

        await zapDispatch.query(owner, accounts[9], specifier.valueOf(), endpoint.valueOf(), params); 
    });
});