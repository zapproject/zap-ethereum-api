const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const Utils = require('./helpers/utils.js');

const ZapRegistry = artifacts.require("ZapRegistry");
const Functions = artifacts.require("Functions"); 
const FunctionsAdmin = artifacts.require("FunctionsAdmin");

import EVMRevert from './helpers/EVMRevert';

const deployZapRegistry = () => {
    return ZapRegistry.new();
};

const deployFunctions = (registryAddress) => {
    return Functions.new(registryAddress);
};

const deployFunctionsAdmin = () => {
    return FunctionsAdmin.new();
};


contract('Functions', function (accounts) {
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

    it("FUNCTIONS_1 - currentCostOfDot() - Check current dot cost calculations", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        const dotNumber = 99;


        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[5] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLinear, start, mul, { from: accounts[5] });

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[6] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveExponential, start, mul, { from: accounts[6] });

        await zapRegistry.initiateProvider(publicKey, title, specifier.valueOf(), params, { from: accounts[7] });
        await zapRegistry.initiateProviderCurve(specifier.valueOf(), curveLogarithmic, start, mul, { from: accounts[7] });


        const linearDotCost = mul * dotNumber + start
        const expDotCost = mul * Math.pow(dotNumber, 2) + start;
        const logDotCost = Math.ceil(mul * Math.log2(dotNumber) + start);

        const res1 = await functions.currentCostOfDot.call(accounts[5], specifier.valueOf(), dotNumber);
        const ethLinearRes = parseInt(res1.valueOf());

        const res2 = await functions.currentCostOfDot.call(accounts[6], specifier.valueOf(), dotNumber);
        const ethExpRes = parseInt(res2.valueOf());

        const res3 = await functions.currentCostOfDot.call(accounts[7], specifier.valueOf(), dotNumber);
        const ethLogrRes = parseInt(res3.valueOf());

        expect(ethLinearRes).to.be.equal(linearDotCost);
        expect(ethExpRes).to.be.equal(expDotCost);
        expect(ethLogrRes).to.be.equal(logDotCost);
    });

 
    it("FUNCTIONS_2 - fastlog2() - Check log2 calculations", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);

        let jsResult = Math.ceil(Math.log2(2));
        let res = await functions.fastlog2.call(2, { from: owner });
        let ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(4));
        res = await functions.fastlog2.call(4, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(99));
        res = await functions.fastlog2.call(99, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(55));
        res = await functions.fastlog2.call(55, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);

        jsResult = Math.ceil(Math.log2(100));
        res = await functions.fastlog2.call(100, { from: owner });
        ethResult = parseInt(res.valueOf());
        expect(jsResult).to.be.equal(ethResult);
    });

    it("FUNCTIONS_3 - FunctionsAdmin() - Check that admin is deployer after contract creation", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);
        let functionsAdmin = await deployFunctionsAdmin();

        const res = await functionsAdmin.adminAddress.call();
        expect(res.valueOf()).to.be.equal(owner);
    });


    it("FUNCTIONS_4 - changeAdmin() - Check that admin can be changed", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);
        let functionsAdmin = await deployFunctionsAdmin();

        await functionsAdmin.changeAdmin(accounts[1], { from: owner });

        const res = await functionsAdmin.adminAddress.call();
        expect(res.valueOf()).to.be.equal(accounts[1]);
    });

    it("FUNCTIONS_5 - changeAdmin() - Check that not admin can not change admin", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);
        let functionsAdmin = await deployFunctionsAdmin();

        expect(functionsAdmin.changeAdmin(accounts[1], { from: accounts[1] })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("FUNCTIONS_6 - setFunctionsAddress() - Check that user can set functions contract address", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);
        let functionsAdmin = await deployFunctionsAdmin();

        await functionsAdmin.setFunctionsAddress(functions.address, { from: owner });

        const res = await functionsAdmin.functions.call();
        expect(res.valueOf()).to.be.equal(functions.address);
    });

    it("FUNCTIONS_7 - setFunctionsAddress() - Check that only admin can set functions contract address", async function () {
        let zapRegistry = await deployZapRegistry();
        let functions = await deployFunctions(zapRegistry.address);
        let functionsAdmin = await deployFunctionsAdmin();

        expect(functionsAdmin.setFunctionsAddress(functions.address, { from: accounts[2] })).to.eventually.be.rejected;
    });
});