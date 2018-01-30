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

    it("ZAP_DISPATCH_2 - Check query function call", async function () {
        try {
            let zapDispatch = await deployZapDispatch();

            let zapToken = await deployZapToken();
            let zapRegistry = await deployZapRegistry();
            let zapBondage = await deployZapBondage(zapToken.address, zapRegistry.address);

            await zapDispatch.setBondageAddress.sendTransaction(zapBondage.address);

            await zapDispatch.query();
        } catch (err) {
            assert(false, err.message);
        }
    });
});