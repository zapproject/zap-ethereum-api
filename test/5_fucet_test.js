const BigNumber = web3.BigNumber;

const expect = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .expect;

// import EVMRevert from './helpers/EVMRevert';


const ZapFaucet = artifacts.require("ZapFaucet");
const TheToken = artifacts.require("TheToken");

const deployTheToken = () => {
    return TheToken.new();
};

const deployZapFaucet = (tokenAddress, ownerAddress) => {
    return ZapFaucet.new(tokenAddress, ownerAddress);
};


contract('ZapFaucet', function (accounts) {
    const owner = accounts[0];
    const buyer = accounts[1];

    beforeEach(async function deployContracts() {
        this.currentTest.theToken = await deployTehToken();
        this.currentTest.zapFaucet = await deployZapFaucet(this.currentTest.theToken.address, owner);
    });


    it("ZAP_FAUCET_1 - pay - Check payable function", async function () {
        const tDecimals = new BigNumber((await this.test.theToken.decimals.call()).valueOf());
        const fDecimals = new BigNumber((await this.test.zapFaucet.decimals.call()).valueOf());
        const rate = new BigNumber((await this.test.zapFaucet.rate.call()).valueOf());

        const weiToSend = new BigNumber("10000");
        const tokensForAllocate = 1000000 * Math.pow(10, 18);

        await this.test.theToken.allocate(this.test.zapFaucet.address, tokensForAllocate);
        await this.test.zapFaucet.sendTransaction({from: buyer, value: weiToSend});

        const buyerBalance = await this.test.theToken.balanceOf.call(buyer);
        console.log(buyerBalance);
        const jsRes = weiToSend.mul(Math.pow(10, tDecimals.toNumber())).div(rate).toNumber();
        console.log(rate);
        console.log(jsRes);
        expect(new BigNumber(buyerBalance.valueOf()).toNumber()).to.be.equal(Math.floor(jsRes));
    });

    // it("ZAP_FAUCET_2 - pay - Check that payable function will throw revert if msg.value <= 0", async function () {
    //     await this.test.theToken.allocate(this.test.zapFaucet.address, 1000000 * Math.pow(10, 18));
    //     expect(this.test.zapFaucet.sendTransaction({from: buyer, value: 0})).to.eventually.be.rejectedWith(EVMRevert);
    // });

    it("ZAP_FAUCET_3 - withdrawZap() - Check that withdrawZap() function is working", async function () {
        const tokensForAllocate = new BigNumber(1000000 * Math.pow(10, 18));
        await this.test.theToken.allocate(this.test.zapFaucet.address, tokensForAllocate);
        await this.test.zapFaucet.withdrawZap();
        const ownerBalance = await this.test.theToken.balanceOf.call(owner);
        expect(tokensForAllocate.toNumber()).to.be.equal(new BigNumber(ownerBalance.valueOf()).toNumber());
    });

    // it("ZAP_FAUCET_4 - withdrawZap() - Check that withdrawZap() function can be called only by owner", async function () {
    //     expect(this.test.zapFaucet.withdrawZap({from: buyer})).to.eventually.be.rejectedWith(EVMRevert);
    // });

    it("ZAP_FAUCET_5 - withdrawEther() - Check that withdrawEther() function is working", async function () {
        const tokensForAllocate = new BigNumber(1000000 * Math.pow(10, 18));
        const ownerEtherBefore = new BigNumber((await web3.eth.getBalance(owner)).valueOf());
        const weiToSend = new BigNumber("1000000000000000000");

        await this.test.theToken.allocate(this.test.zapFaucet.address, tokensForAllocate);
        await this.test.zapFaucet.sendTransaction({from: buyer, value: weiToSend});
        await this.test.zapFaucet.withdrawEther();
        
        const ownerEtherAfter = new BigNumber((await web3.eth.getBalance(owner)).valueOf());
        
        expect(ownerEtherAfter.toNumber() > ownerEtherBefore.toNumber()).to.be.equal(true);
    });

    // it("ZAP_FAUCET_6 - withdrawEther() - Check that withdrawEther() function can be called only by owner", async function () {
    //     const tokensForAllocate = new BigNumber(1000000 * Math.pow(10, 18));
    //     const ownerEtherBefore = new BigNumber((await web3.eth.getBalance(owner)).valueOf());
    //     const weiToSend = new BigNumber("10000");

    //     await this.test.theToken.allocate(this.test.zapFaucet.address, tokensForAllocate);
    //     await this.test.zapFaucet.sendTransaction({from: buyer, value: weiToSend});
    //     expect(this.test.zapFaucet.withdrawEther({from: buyer})).to.eventually.be.rejectedWith(EVMRevert);
    // });

});