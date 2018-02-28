const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;
import EVMRevert from './helpers/EVMRevert';

const ZapToken = artifacts.require("ZapToken");

const deployZapToken = () => {
    return ZapToken.new();
};

contract('ZapToken', function (accounts) {
    const owner = accounts[0];
    const recevier = accounts[1];
    const sender = accounts[2];

    const tokensForOwner = new BigNumber("1e24");
    const tokensForRecevier = new BigNumber("55e18");
    const tokensForSender = new BigNumber("77e18");

    const approveTokens = new BigNumber("18e18");

    beforeEach(async function deployContracts() {
        this.currentTest.zapToken = await deployZapToken();
    });

    it("ZAP_TOKEN_1 - balanceOf() - Check that account balances after creation is 0", async function () {
        const ownerRes = await this.test.zapToken.balanceOf.call(owner, { from: owner });
        expect(parseInt(ownerRes.valueOf())).to.be.equal(0);

        const recevierRes = await this.test.zapToken.balanceOf.call(recevier, { from: recevier });
        expect(parseInt(recevierRes.valueOf())).to.be.equal(0);

        const senderRes = await this.test.zapToken.balanceOf.call(sender, { from: sender });
        expect(parseInt(senderRes.valueOf())).to.be.equal(0);
    });

    it("ZAP_TOKEN_2 - allocate(), balanceOf() - Check that account balances after allocating is not 0", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const ownerRes = await this.test.zapToken.balanceOf.call(owner, { from: owner });
        expect(new BigNumber(ownerRes.valueOf()).toNumber()).to.be.equal(tokensForOwner.toNumber());

        const recevierRes = await this.test.zapToken.balanceOf.call(recevier, { from: owner });
        expect(new BigNumber(recevierRes.valueOf()).toNumber()).to.be.equal(tokensForRecevier.toNumber());

        const senderRes = await this.test.zapToken.balanceOf.call(sender, { from: owner });
        expect(new BigNumber(senderRes.valueOf()).toNumber()).to.be.equal(tokensForSender.toNumber());
    });

    it("ZAP_TOKEN_3 - allocate() - Check that not owner can't allocate", async function () {
        expect(this.test.zapToken.allocate(owner, tokensForOwner, { from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_4 - mint() - Check that owner can mint tokens", async function () {
        await this.test.zapToken.mint(owner, tokensForOwner, { from: owner });

        const ownerRes = await this.test.zapToken.balanceOf.call(owner, { from: owner });
        expect(new BigNumber(ownerRes.valueOf()).toNumber()).to.be.equal(tokensForOwner.toNumber());
    });

    it("ZAP_TOKEN_5 - mint() - Check that not owner can't mint tokens", async function () {
        expect(this.test.zapToken.mint(owner, tokensForOwner, { from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_6 - finishMinting() - Check that owner can finish minting", async function () {
        await this.test.zapToken.finishMinting({ from: owner });

        const isFinished = await this.test.zapToken.mintingFinished.call();
        expect(isFinished.valueOf()).to.be.equal(true);
    });

    it("ZAP_TOKEN_7 - finishMinting() - Check that not owner can't finish minting", async function () {
        expect(this.test.zapToken.finishMinting({ from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_8 - allocate() - Check that allocation not available after minting was finished", async function () {
        await this.test.zapToken.finishMinting({ from: owner });

        expect(this.test.zapToken.allocate(owner, tokensForOwner, { from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_9 - mint() - Check that minting not available after it was finished", async function () {
        await this.test.zapToken.finishMinting({ from: owner });

        expect(this.test.zapToken.mint(owner, tokensForOwner, { from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_10 - approve() - Check that user can approve tokens for another user", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        await this.test.zapToken.approve(sender, approveTokens, { from: owner });

        const allowance = await this.test.zapToken.allowance.call(owner, sender);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(approveTokens.toNumber());
    });

    it("ZAP_TOKEN_11 - allowance() - Check that default allowance is 0", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        let allowance = await this.test.zapToken.allowance.call(owner, sender);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(0);

        allowance = await this.test.zapToken.allowance.call(owner, recevier);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(0);

        allowance = await this.test.zapToken.allowance.call(recevier, sender);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(0);
    });

    it("ZAP_TOKEN_12 - increaseApproval() - Check that user can increase aproved tokens", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const inc = new BigNumber("2e18");

        await this.test.zapToken.approve(sender, approveTokens, { from: owner });
        await this.test.zapToken.increaseApproval(sender, inc, { from: owner });

        const allowance = await this.test.zapToken.allowance.call(owner, sender);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(approveTokens.plus(inc).toNumber());
    });

    it("ZAP_TOKEN_13 - decreaseApproval() - Check that user can approve tokens for another user", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const dec = new BigNumber("2e18");

        await this.test.zapToken.approve(sender, approveTokens, { from: owner });
        await this.test.zapToken.decreaseApproval(sender, dec, { from: owner });

        const allowance = await this.test.zapToken.allowance.call(owner, sender);
        expect(new BigNumber(allowance.valueOf()).toNumber()).to.be.equal(approveTokens.minus(dec).toNumber());
    });

    it("ZAP_TOKEN_14 - transferFrom() - Check that user can transfer approved tokens from another address", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = new BigNumber("5e18");

        await this.test.zapToken.approve(recevier, approveTokens, { from: sender });

        await this.test.zapToken.transferFrom(sender, recevier, sendValue, { from: recevier});

        let res = await this.test.zapToken.balanceOf(recevier);
        expect(new BigNumber(res.valueOf()).toNumber()).to.be.equal(tokensForRecevier.plus(sendValue).toNumber());

        res = await this.test.zapToken.balanceOf(sender);
        expect(new BigNumber(res.valueOf()).toNumber()).to.be.equal(tokensForSender.minus(sendValue).toNumber());
    });

    it("ZAP_TOKEN_15 - transferFrom() - Check that user can't transfer unapproved tokens from another address", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = new BigNumber("5e18");

        expect(this.test.zapToken.transferFrom(sender, recevier, sendValue, { from: recevier})).to.eventually.be.rejected;
    });

    it("ZAP_TOKEN_16 - transferFrom() - Check that user can't transfer more tokens than approved", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        await this.test.zapToken.approve(recevier, approveTokens, { from: sender });

        expect(this.test.zapToken.transferFrom(sender, recevier, sendValue, { from: recevier})).to.eventually.be.rejected;
    });

    it("ZAP_TOKEN_17 - transferOwnership() - Check that owner can transfer ownership", async function () {
        await this.test.zapToken.transferOwnership(recevier, { from: owner });
        const res = await this.test.zapToken.owner.call();
        expect(res.valueOf()).to.be.equal(recevier);
    });

    it("ZAP_TOKEN_18 - transferOwnership() - Check that not owner can't transfer ownership", async function () {
        expect(this.test.zapToken.transferOwnership(recevier, { from: sender })).to.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_19 - transfer() - Check that user transfer tokens", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        await this.test.zapToken.transfer(recevier, sendValue, { from: sender });

        let res = await this.test.zapToken.balanceOf.call(sender);
        expect(new BigNumber(res.valueOf()).toNumber()).to.be.equal(tokensForSender.minus(sendValue).toNumber());

        res = await this.test.zapToken.balanceOf.call(recevier);
        expect(new BigNumber(res.valueOf()).toNumber()).to.be.equal(tokensForRecevier.plus(sendValue).toNumber());
    });

    it("ZAP_TOKEN_20 - transfer() - Check that user can't transfer more tokens than have", async function () {
        await this.test.zapToken.allocate(owner, tokensForOwner, { from: owner });
        await this.test.zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await this.test.zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        expect(this.test.zapToken.transfer(recevier, tokensForSender.plus(sendValue), { from: sender })).to.eventually.be.rejected;
    });
});