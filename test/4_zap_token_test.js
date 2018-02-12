const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();
import EVMRevert from './helpers/EVMRevert';

const ZapToken = artifacts.require("ZapToken");

const deployZapToken = () => {
    return ZapToken.new();
};

const DECIMALS = 1000000000000000000;

contract('ZapToken', function (accounts) {
    const owner = accounts[0];
    const recevier = accounts[1];
    const sender = accounts[2];

    const tokensForOwner = new BigNumber("1e24");
    const tokensForRecevier = new BigNumber("55e18");
    const tokensForSender = new BigNumber("77e18");

    const approveTokens = new BigNumber("18e18");

    it("ZAP_TOKEN_1 - balanceOf() - Check that account balances after creation is 0", async function () {
        let zapToken = await deployZapToken();

        const ownerRes = await zapToken.balanceOf.call(owner, { from: owner });
        parseInt(ownerRes.valueOf()).should.be.equal(0);

        const recevierRes = await zapToken.balanceOf.call(recevier, { from: recevier });
        parseInt(recevierRes.valueOf()).should.be.equal(0);

        const senderRes = await zapToken.balanceOf.call(sender, { from: sender });
        parseInt(senderRes.valueOf()).should.be.equal(0);
    });

    it("ZAP_TOKEN_2 - allocate(), balanceOf() - Check that account balances after allocating is not 0", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const ownerRes = await zapToken.balanceOf.call(owner, { from: owner });
        new BigNumber(ownerRes.valueOf()).toNumber().should.be.equal(tokensForOwner.toNumber());

        const recevierRes = await zapToken.balanceOf.call(recevier, { from: owner });
        new BigNumber(recevierRes.valueOf()).toNumber().should.be.equal(tokensForRecevier.toNumber());

        const senderRes = await zapToken.balanceOf.call(sender, { from: owner });
        new BigNumber(senderRes.valueOf()).toNumber().should.be.equal(tokensForSender.toNumber());
    });

    it("ZAP_TOKEN_3 - allocate() - Check that not owner can't allocate", async function () {
        let zapToken = await deployZapToken();

        zapToken.allocate(owner, tokensForOwner, { from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_4 - mint() - Check that owner can mint tokens", async function () {
        let zapToken = await deployZapToken();

        await zapToken.mint(owner, tokensForOwner, { from: owner });

        const ownerRes = await zapToken.balanceOf.call(owner, { from: owner });
        new BigNumber(ownerRes.valueOf()).toNumber().should.be.equal(tokensForOwner.toNumber());
    });

    it("ZAP_TOKEN_5 - mint() - Check that not owner can't mint tokens", async function () {
        let zapToken = await deployZapToken();

        zapToken.mint(owner, tokensForOwner, { from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_6 - finishMinting() - Check that owner can finish minting", async function () {
        let zapToken = await deployZapToken();

        await zapToken.finishMinting({ from: owner });

        const isFinished = await zapToken.mintingFinished.call();
        isFinished.valueOf().should.be.equal(true);
    });

    it("ZAP_TOKEN_7 - finishMinting() - Check that not owner can't finish minting", async function () {
        let zapToken = await deployZapToken();

        zapToken.finishMinting({ from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_8 - allocate() - Check that allocation not available after minting was finished", async function () {
        let zapToken = await deployZapToken();

        await zapToken.finishMinting({ from: owner });

        zapToken.allocate(owner, tokensForOwner, { from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_9 - mint() - Check that minting not available after it was finished", async function () {
        let zapToken = await deployZapToken();

        await zapToken.finishMinting({ from: owner });

        zapToken.mint(owner, tokensForOwner, { from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_10 - approve() - Check that user can approve tokens for another user", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        await zapToken.approve(sender, approveTokens, { from: owner });

        const allowance = await zapToken.allowance.call(owner, sender);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(approveTokens.toNumber());
    });

    it("ZAP_TOKEN_11 - allowance() - Check that default allowance is 0", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        let allowance = await zapToken.allowance.call(owner, sender);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(0);

        allowance = await zapToken.allowance.call(owner, recevier);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(0);

        allowance = await zapToken.allowance.call(recevier, sender);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(0);
    });

    it("ZAP_TOKEN_12 - increaseApproval() - Check that user can increase aproved tokens", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const inc = new BigNumber("2e18");

        await zapToken.approve(sender, approveTokens, { from: owner });
        await zapToken.increaseApproval(sender, inc, { from: owner });

        const allowance = await zapToken.allowance.call(owner, sender);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(approveTokens.plus(inc).toNumber());
    });

    it("ZAP_TOKEN_13 - decreaseApproval() - Check that user can approve tokens for another user", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const dec = new BigNumber("2e18");

        await zapToken.approve(sender, approveTokens, { from: owner });
        await zapToken.decreaseApproval(sender, dec, { from: owner });

        const allowance = await zapToken.allowance.call(owner, sender);
        new BigNumber(allowance.valueOf()).toNumber().should.be.equal(approveTokens.minus(dec).toNumber());
    });

    it("ZAP_TOKEN_14 - transferFrom() - Check that user can transfer approved tokens from another address", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = new BigNumber("5e18");

        await zapToken.approve(recevier, approveTokens, { from: sender });

        await zapToken.transferFrom(sender, recevier, sendValue, { from: recevier});

        let res = await zapToken.balanceOf(recevier);
        new BigNumber(res.valueOf()).toNumber().should.be.equal(tokensForRecevier.plus(sendValue).toNumber());

        res = await zapToken.balanceOf(sender);
        new BigNumber(res.valueOf()).toNumber().should.be.equal(tokensForSender.minus(sendValue).toNumber());
    });

    it("ZAP_TOKEN_15 - transferFrom() - Check that user can't transfer unapproved tokens from another address", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = new BigNumber("5e18");

        zapToken.transferFrom(sender, recevier, sendValue, { from: recevier}).should.eventually.be.rejected;
    });

    it("ZAP_TOKEN_16 - transferFrom() - Check that user can't transfer more tokens than approved", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        await zapToken.approve(recevier, approveTokens, { from: sender });

        zapToken.transferFrom(sender, recevier, sendValue, { from: recevier}).should.eventually.be.rejected;
    });

    it("ZAP_TOKEN_17 - transferOwnership() - Check that owner can transfer ownership", async function () {
        let zapToken = await deployZapToken();

        await zapToken.transferOwnership(recevier, { from: owner });
        const res = await zapToken.owner.call();
        res.valueOf().should.be.equal(recevier);
    });

    it("ZAP_TOKEN_18 - transferOwnership() - Check that not owner can't transfer ownership", async function () {
        let zapToken = await deployZapToken();

        zapToken.transferOwnership(recevier, { from: sender }).should.eventually.be.rejectedWith(EVMRevert);
    });

    it("ZAP_TOKEN_19 - transfer() - Check that user transfer tokens", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        await zapToken.transfer(recevier, sendValue, { from: sender });

        let res = await zapToken.balanceOf.call(sender);
        new BigNumber(res.valueOf()).toNumber().should.be.equal(tokensForSender.minus(sendValue).toNumber());

        res = await zapToken.balanceOf.call(recevier);
        new BigNumber(res.valueOf()).toNumber().should.be.equal(tokensForRecevier.plus(sendValue).toNumber());
    });

    it("ZAP_TOKEN_20 - transfer() - Check that user can't transfer more tokens than have", async function () {
        let zapToken = await deployZapToken();

        await zapToken.allocate(owner, tokensForOwner, { from: owner });
        await zapToken.allocate(recevier, tokensForRecevier, { from: owner });
        await zapToken.allocate(sender, tokensForSender, { from: owner });

        const sendValue = approveTokens.plus(new BigNumber("2e18"));

        zapToken.transfer(recevier, tokensForSender.plus(sendValue), { from: sender }).should.eventually.be.rejected;
    });
});