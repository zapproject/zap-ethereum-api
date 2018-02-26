const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');

const ZapRegistry = artifacts.require("ZapRegistry");
const ProxyDispatcher = artifacts.require("ProxyDispatcher");
const ProxyDispatcherStorage = artifacts.require("ProxyDispatcherStorage");
const FunctionsLib = artifacts.require("FunctionsLib");
const TestLib = artifacts.require("TestLib");
const TestContract = artifacts.require("TestLibContract");


import EVMRevert from './helpers/EVMRevert';

var replaceAddr = '1111222233334444555566667777888899990000';

const deployLib = () => {
    return FunctionsLib.new();
}

const deployTestLib = () => {
    return TestLib.new();
}

const deployDispatcherStorage = (libAddr) => {
    return ProxyDispatcherStorage.new(libAddr)
}

const deployDispatcher = (dispatcherStorage) => {
    ProxyDispatcher.unlinked_binary = ProxyDispatcher.unlinked_binary.replace(replaceAddr, dispatcherStorage.address.slice(2));
    replaceAddr = dispatcherStorage.address.slice(2);
    return ProxyDispatcher.new()
}

const deployTestContract = (dispatcherAddress) => {
    TestContract.link('LibInterface', dispatcherAddress);
    return TestContract.new();
};


contract('Proxy Library', function (accounts) {
    const owner = accounts[0];

    const publicKey = 111;
    const title = "test";
    const routeKeys = [1];
    const params = ["param1", "param2"];

    const specifier = new String("test-specifier");
    const curveLinear = Utils.CurveTypes["Linear"];
    const curveExponential = Utils.CurveTypes["Exponential"];
    const curveLogarithmic = Utils.CurveTypes["Logarithmic"];
    const zeroAddress = Utils.ZeroAddress;
    const start = 1;
    const mul = 2;

    beforeEach(async function deployContracts() {
        this.currentTest.functionsLib = await deployLib();
        this.currentTest.testLib = await deployTestLib();
        this.currentTest.storage = await deployDispatcherStorage(this.currentTest.functionsLib.address);
        this.currentTest.dispatcher = await deployDispatcher(this.currentTest.storage);
        this.currentTest.testContract = await deployTestContract(this.currentTest.dispatcher.address);
    });

    it("PROXY_LIB_1 - currentCostOfDot() - Check current dot cost calculations", async function () {
        const dotNumber = 99;
        const linearDotCost = mul * dotNumber + start
        const expDotCost = mul * Math.pow(dotNumber, 2) + start;
        const logDotCost = Math.ceil(mul * Math.log2(dotNumber) + start);

        const res1 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveLinear, start, mul);
        const ethLinearRes = parseInt(res1.valueOf());

        const res2 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveExponential, start, mul);
        const ethExpRes = parseInt(res2.valueOf());

        const res3 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveLogarithmic, start, mul);
        const ethLogrRes = parseInt(res3.valueOf());

        expect(ethLinearRes).to.be.equal(linearDotCost);
        expect(ethExpRes).to.be.equal(expDotCost);
        expect(ethLogrRes).to.be.equal(logDotCost);
    });

 
    it("PROXY_LIB_2 - fastlog2() - Check log2 calculations", async function () {
        let jsResult = Math.ceil(Math.log2(2));
        let res = await this.test.testContract.fastlog2.call(2, { from: owner });
        let ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(4));
        res = await this.test.testContract.fastlog2.call(4, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(99));
        res = await this.test.testContract.fastlog2.call(99, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(55));
        res = await this.test.testContract.fastlog2.call(55, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(100));
        res = await this.test.testContract.fastlog2.call(100, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);
    });

    it("PROXY_LIB_3 - replace() - Check that owner can change lib implementation", async function () {
        await this.test.storage.replace(this.test.testLib.address, {from: owner});

        const testLibDotCost = 88;
        const testLibLogRet = 0;

        const dotNumber = 99;

        const res1 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveLinear, start, mul);
        const ethLinearRes = parseInt(res1.valueOf());

        const res2 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveExponential, start, mul);
        const ethExpRes = parseInt(res2.valueOf());

        const res3 = await this.test.testContract.currentCostOfDot.call(dotNumber, curveLogarithmic, start, mul);
        const ethLogrRes = parseInt(res3.valueOf());

        expect(ethLinearRes).to.be.equal(testLibDotCost);
        expect(ethExpRes).to.be.equal(testLibDotCost);
        expect(ethLogrRes).to.be.equal(testLibDotCost);

        let res = await this.test.testContract.fastlog2.call(2, { from: owner });
        let ethResult = parseInt(res.valueOf());

        expect(testLibLogRet).to.be.equal(ethResult);
    });

    it("PROXY_LIB_4 - replace() - Check that replace can be called only by owner", async function () {
        expect(this.test.storage.replace(this.test.testLib.address, {from: accounts[8]})).to.eventually.be.rejectedWith(EVMRevert);
    });
});