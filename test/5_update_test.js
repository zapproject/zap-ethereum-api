import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

const AddressesSpace = artifacts.require("AddressSpace");
const AddressesPointer = artifacts.require("AddressSpacePointer");
const Bondage = artifacts.require("Bondage");
const BondageStorage = artifacts.require("BondageStorage");
const Registry = artifacts.require("Registry");
const RegistryStorage = artifacts.require("RegistryStorage");
const ZapToken = artifacts.require("ZapToken");
const Dispatch = artifacts.require("Dispatch");
const DispatchStorage = artifacts.require("DispatchStorage");
const Arbiter = artifacts.require("Arbiter");
const ArbiterStorage = artifacts.require("ArbiterStorage");
const Cost = artifacts.require("CurrentCost");
const Update = artifacts.require("Update");

const Utils = require("./helpers/utils.js");

contract('Registry', async (accounts) => {
    const owner = accounts[0];

    beforeEach(async function deployContracts() {
        this.currentTest.addrSpace = await AddressesSpace.new("0x0", "0x0", "0x0", "0x0", "0x0");
        this.currentTest.addrPtr = await AddressesPointer.new();
        this.currentTest.addrPtr.setAddressSpace(this.currentTest.addrSpace.address);

        // Token
        this.currentTest.token = await ZapToken.new();

        // Registry
        this.currentTest.regStor = await RegistryStorage.new();
        this.currentTest.registry = await Registry.new(this.currentTest.regStor.address);
        await this.currentTest.regStor.transferOwnership(this.currentTest.registry.address);

        // Current cost
        this.currentTest.cost = await Cost.new(this.currentTest.addrPtr.address ,this.currentTest.registry.address);

        // Bondage
        this.currentTest.bondStor = await BondageStorage.new();
        this.currentTest.bondage = await Bondage.new(this.currentTest.addrPtr.address, this.currentTest.bondStor.address, this.currentTest.token.address, this.currentTest.cost.address);
        await this.currentTest.bondStor.transferOwnership(this.currentTest.bondage.address);

        // Arbiter
        this.currentTest.arbStor = await ArbiterStorage.new();
        this.currentTest.arbiter = await Arbiter.new(this.currentTest.addrPtr.address, this.currentTest.arbStor.address, this.currentTest.bondage.address);
        await this.currentTest.arbStor.transferOwnership(this.currentTest.arbiter.address);

        // Dispatch
        this.currentTest.dispStor = await DispatchStorage.new();
        this.currentTest.dispatch = await Dispatch.new(this.currentTest.addrPtr.address, this.currentTest.dispStor.address, this.currentTest.bondage.address);
        await this.currentTest.dispStor.transferOwnership(this.currentTest.dispatch.address);

        await this.currentTest.addrSpace.setRegistryAddress(this.currentTest.registry.address);
        await this.currentTest.addrSpace.setBondageAddress(this.currentTest.bondage.address);
        await this.currentTest.addrSpace.setArbiterAddress(this.currentTest.arbiter.address);
        await this.currentTest.addrSpace.setDispatchAddress(this.currentTest.dispatch.address);
        await this.currentTest.addrSpace.setCurrentCostAddress(this.currentTest.cost.address);

        //Update
        this.currentTest.update = await Update.new(this.currentTest.addrPtr.address);      
    });

    it("UPDATE_1 - Update() - Check update contract creating", async function () {
       
    });

    it("UPDATE_2 - updateContracts() - Check update contract creating", async function () {
        await this.test.update.updateContracts();
    });

});
