import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const CurrentCost = artifacts.require("CurrentCost");

const Utils = require("./helpers/utils.js");

function hex2a(hexx) { 
    let hex = hexx.toString(); //force conversion
    let str = '';
    for (let i = 2; i < hex.length; i += 2) {
        let hexValue = hex.substr(i, 2);
        if (hexValue != "00" && hexValue != "0x") {
            str += String.fromCharCode(parseInt(hexValue, 16));
        }
    }
    return str;
}

contract('Registry', async (accounts) => {
    const owner = accounts[0];
    const publicKey = 111;
    const title = "test";
    const specifier = "test-linear-specifier";
    const params = ["param1", "param2"];

    const parts= [0,5,5,100];
    const constants = [2,2,0,1,1,1,10,0,0];
    const dividers=[1,3];

    beforeEach(async function deployContracts() {
        this.currentTest.stor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.stor.address);
        this.currentTest.currentCost = await CurrentCost.new(this.currentTest.registry.address);
        await this.currentTest.stor.transferOwnership(this.currentTest.registry.address);
    });

    it("REGISTRY_1 - initiateProvider() - Check that we can initiate provider", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, {from: owner });
    });

    it("REGISTRY_2 - initiateProvider() - Check that we can't change provider info if it was initated", async function () {
        const newPublicKey = 222;
        const newTitle = "test-test";

        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await expect(this.test.registry.initiateProvider(newPublicKey, newTitle, specifier, params, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_3 - initiateProviderCurve() - Check that we can initiate provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, constants, parts, dividers, { from: owner });
    });

    it("REGISTRY_4 - initiateProviderCurve() - Check that we can't initiate provider curve if provider wasn't initiated", async function () {
        await expect(this.test.registry.initiateProviderCurve(specifier, constants, parts, dividers, { from: owner })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_5 - initiateProviderCurve() - Check that we can't initiate provider curve if passing in invalid curve arguments ", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await expect(this.test.registry.initiateProviderCurve(specifier,parts, constants, dividers, { from: owner }))
            .to.eventually.be.rejectedWith(EVMRevert);
    });

    it("REGISTRY_6 - getNextEndpointParam() - Check that we can get provider route keys", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedParam1 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);
        const receivedParam2 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 1);
        await expect(Utils.fetchPureArray([receivedParam1.valueOf(), receivedParam2.valueOf()], hex2a)).to.have.deep.members(params);
    });

    it("REGISTRY_7 - getNextEndpointParam() - Check that route keys of uninitialized provider are empty", async function () {
        const res = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);

        // can not use chai, because it can not compare empty arrays
        assert(res, []);
    });

    it("REGISTRY_8 - getProviderTitle() - Check that we can get provider title", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);

        await expect(hex2a(receivedTitle.valueOf())).to.be.equal(title);
    });

    it("REGISTRY_9 - getProviderTitle() - Check that title of uninitialized provider is empty", async function () {
        const receivedTitle = await this.test.registry.getProviderTitle.call(owner);

        await expect(hex2a(receivedTitle.valueOf())).to.be.equal('');
    });

    it("REGISTRY_10 - getProviderPublicKey() - Check that we can get provider public key", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const receivedPublicKey = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(receivedPublicKey.valueOf()).to.be.equal(publicKey.toString());
    });

    it("REGISTRY_11 - getProviderPublicKey() -  Check that public key of uninitialized provider is equal to 0", async function () {
        const res = await this.test.registry.getProviderPublicKey.call(owner);

        await expect(res.valueOf()).to.be.equal('0');
    });

    it("REGISTRY_12 - getProviderCurve() - Check that we initialize and get provider curve", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });
        await this.test.registry.initiateProviderCurve(specifier, constants, parts, dividers, { from: owner });
        const curve = await this.test.registry.getProviderCurve.call(owner, specifier, { from: owner });
        for(let item of curve) {
            let arr = Utils.fetchPureArray(item,parseInt)
            expect(arr).to.be.an('array');
            expect(arr.length.valueOf()).to.be.greaterThan(0);
        }
        expect(Utils.fetchPureArray(curve[0],parseInt)).to.deep.equal(constants);
        expect(Utils.fetchPureArray(curve[1],parseInt)).to.deep.equal(parts);
        expect(Utils.fetchPureArray(curve[2],parseInt)).to.deep.equal(dividers);
        const args = await this.test.registry.getProviderArgsLength.call(owner,specifier,{from:owner});
        let lenArr = Utils.fetchPureArray(args,parseInt)
        expect(lenArr.length.valueOf()).to.be.equal(3);
        expect(lenArr[0]).to.be.equal(constants.length);
        expect(lenArr[1]).to.be.equal(parts.length);
        expect(lenArr[2]).to.be.equal(dividers.length);

    });

    it("REGISTRY_13 - getProviderCurve() - Check that uninitialized provider curve is empty", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const res = await this.test.registry.getProviderCurve.call(owner, specifier, { from: owner });
        console.log("result : ", res)
        for(let arr of res ) {
            arr = Utils.fetchPureArray(arr, parseInt);
            await expect(arr.length.valueOf()).to.be.an('number').equal(0);
        }
    });

    it("REGISTRY_14 - setEndpointParams() - Check that we can set endpoint params", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        const newParams = ["p", "a", "r", "a", "m", "s"];

        await this.test.registry.setEndpointParams(specifier, newParams, { from: owner });

        const p1 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 0);
        const p2 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 1);
        const p3 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 2);
        const p4 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 3);
        const p5 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 4);
        const p6 = await this.test.registry.getNextEndpointParam.call(owner, specifier, 5);

        await expect(Utils.fetchPureArray([p1.valueOf(), p2.valueOf(), p3.valueOf(), p4.valueOf(), p5.valueOf(), p6.valueOf()], hex2a)).to.have.deep.members(newParams);
    });

    it("REGISTRY_15 - getNextProvider() - Check that we can iterate through providers", async function () {
        await this.test.registry.initiateProvider(publicKey, title, specifier, params, { from: owner });

        await this.test.registry.initiateProvider(publicKey + 1, title + "1", specifier + "1", params, { from: accounts[1] });

        await this.test.registry.initiateProvider(publicKey + 2, title + "2", specifier + "2", params, { from: accounts[2] });

        let index = 0;
        let res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title);
        index = parseInt(res[0].valueOf());

        res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title + "1");
        index = parseInt(res[0].valueOf());

        res = await this.test.registry.getNextProvider(index);
        await expect(hex2a(res[3].valueOf())).to.be.equal(title + "2");
        index = parseInt(res[0].valueOf());

        await expect(index).to.be.equal(0);
    });
});
