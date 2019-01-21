import EVMRevert from './helpers/EVMRevert';

const should = require('chai')
          .use(require('chai-as-promised'))
          .should();

const ZapCoordinator = artifacts.require("ZapCoordinator");
const Database = artifacts.require("Database");
const Registry = artifacts.require("Registry");
const CurrentCost = artifacts.require("CurrentCost");

const Utils = require("./helpers/utils.js");

contract('ZapCoordinator', async (accounts) => {
    beforeEach(async function deployContracts() {
        // Deploy initial contracts
        this.currentTest.coord = await ZapCoordinator.new();
        this.currentTest.db = await Database.new();
        await this.currentTest.db.transferOwnership(this.currentTest.coord.address).should.be.fulfilled;
        await this.currentTest.coord.addImmutableContract('DATABASE', this.currentTest.db.address).should.be.fulfilled;
    });

    it("COORDINATOR_1 - addImmutableContract() - Check that we can set the DATABASE to provider", async function () {
        // Do nothing, this happens in beforeEach
    });

    it("COORDINATOR_2 - addImmutableContract() - Check that we can't set the DATABASE to provider with the wrong owner", async function () {
        await this.test.coord.addImmutableContract('DATABASE', this.test.db.address, { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });

    it("COORDINATOR_3 - addImmutableContract() - Check that we can't set the DATABASE to a null address", async function () {
        await this.test.coord.addImmutableContract('DATABASE', 0x0, { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });

    it("COORDINATOR_4 - addImmutableContract() - Check that when we set the DATABASE it updates db", async function () {
        let addr = await this.test.coord.db()
        addr.should.equal(this.test.db.address);
    });

    it("COORDINATOR_5 - getContract() - Check that we can get the DATABASE address after setting it", async function () {
        let addr = await this.test.coord.getContract.call('DATABASE');
        addr.should.equal(this.test.db.address);
    });

    it("COORDINATOR_6 - getContractName() - Check that DATABASE doesn't add to loadedContracts", async function () {
        await this.test.coord.getContractName.call(0).should.be.rejectedWith('invalid opcode');
    });

    it("COORDINATOR_7 - updateContract() - Check that we can update REGISTRY", async function () {
        const reg = await Registry.new(this.test.coord.address);
        await this.test.coord.updateContract('REGISTRY', reg.address).should.be.fulfilled;
    });

    it("COORDINATOR_8 - updateContract() - Check that we can't update REGISTRY from an address that's not the owner", async function () {
        const reg = await Registry.new(this.test.coord.address);
        await this.test.coord.updateContract('REGISTRY', reg.address, { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });

    it("COORDINATOR_9 - updateContract() - Check that we can update REGISTRY twice", async function () {
        const reg = await Registry.new(this.test.coord.address);
        const reg2 = await Registry.new(this.test.coord.address);

        await this.test.coord.updateContract('REGISTRY', reg.address).should.be.fulfilled;
        await this.test.coord.updateContract('REGISTRY', reg2.address).should.be.fulfilled;
    });

    it("COORDINATOR_10 - getContract() - Check that we get the REGISTRY address after updateContract", async function () {
        const reg = await Registry.new(this.test.coord.address);

        await this.test.coord.updateContract('REGISTRY', reg.address).should.be.fulfilled;
        let addr = await this.test.coord.getContract.call('REGISTRY').should.be.fulfilled;
        addr.should.equal(reg.address);
    });

    it("COORDINATOR_11 - getContract() - Check that we get the REGISTRY address after two updateContracts", async function () {
        const reg = await Registry.new(this.test.coord.address);
        const reg2 = await Registry.new(this.test.coord.address);

        await this.test.coord.updateContract('REGISTRY', reg.address).should.be.fulfilled;
        await this.test.coord.updateContract('REGISTRY', reg2.address).should.be.fulfilled;

        let addr = await this.test.coord.getContract.call('REGISTRY');
        addr.should.equal(reg2.address);
    });
});
