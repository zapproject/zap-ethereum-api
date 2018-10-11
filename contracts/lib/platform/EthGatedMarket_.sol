pragma solidity ^0.4.0;

import "./ERCDotFactory.sol";

contract EthGatedMarket_ is ERCDotFactory {
    bool public bondAllow = false;
    bool public unbondAllow = false;

    FactoryTokenInterface public gatewayToken;
    bytes32 public gatewaySpecifier;
    uint256 public gatewayRate;
    uint256 public marketRate;

    constructor(address _coordinator, address _tokenFactory) ERCDotFactory(_coordinator, _tokenFactory) {
        reserveToken.approve(this, ~uint256(0));
    }

    function() payable {
    }

    function setGatewayRate(uint256 rate) external onlyOwner {
        gatewayRate = rate;
    }

    function setMarketRate(uint256 rate) external onlyOwner {
        marketRate = rate;
    }

    function initGatewayCurve(
        uint256 providerPubKey,
        bytes32 providerTitle,
        bytes32 specifier,
        bytes32 symbol,
        int256[] curve) onlyOwner {
        gatewayToken = FactoryTokenInterface(
            initializeCurve(
                providerPubKey, providerTitle, specifier, symbol, curve
            )
        );
        gatewayToken.approve(this, ~uint256(0));
        gatewaySpecifier = specifier;
        bondAllow = true;
    }

    //TODO: no way to handle this token
    function initMarketCurve(
        uint256 providerPubKey,
        bytes32 providerTitle,
        bytes32 specifier,
        bytes32 symbol,
        int256[] curve) onlyOwner {
        FactoryTokenInterface token = FactoryTokenInterface(
            initializeCurve(
                providerPubKey, providerTitle, specifier, symbol, curve
            )
        );
        token.approve(this, ~uint256(0));
    }

    ///bond to obtain gateway tokens in exchange for eth, able to bond to gated curves
    function gatewayBond(uint quantity) public payable {
        require(bondAllow, "bond not allowed");

        if (msg.value < getAdapterPrice(gatewaySpecifier, quantity, gatewayRate)) {
            revert("Not enough eth sent for requested number of dots");
        }

        super.bond(this, gatewaySpecifier, quantity);
    }

    ///unbond to obtain eth in exchange for gateway tokens
    function gatewayUnbond(uint quantity) public {
        require(unbondAllow, "unbond not allowed");

        super.unbond(this, gatewaySpecifier, quantity);
    }

    ///bond to gated market with gateway token
    function marketBond(bytes32 specifier, uint quantity) payable external onlyOwner {
        require(
            gatewayToken.transferFrom(msg.sender, address(this), getAdapterPrice(gatewaySpecifier, quantity, gatewayRate)),
            "insufficient accepted token quantity approved for transfer"
        );

        if(msg.value < getAdapterPrice(specifier, quantity, marketRate)){
            revert("Not enough tokens approved for requested number of dots");
        }

        super.bond(this, specifier, quantity);
    }

    ///unbond from gated market with gateway token
    function marketUnbond(bytes32 specifier, uint quantity) external onlyOwner {
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint issued = bondage.getDotsIssued(this, specifier);

        CurrentCostInterface currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint reserveCost = currentCost._costOfNDots(this, specifier, issued + 1 - quantity, quantity - 1);

        super.unbond(this, specifier, quantity);
    }

    function getAdapterPrice(bytes32 specifier, uint quantity, uint rate) view returns(uint){
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint reserveAmount = bondage.calcZapForDots(this, specifier, quantity);
        return reserveAmount * rate;
    }

    function allocateGatewayToken(address _to, uint256 _amount) external onlyOwner {
        gatewayToken.mint(_to, _amount);
    }

    ///allow bond
    function allowBond() onlyOwner {
        bondAllow = true;
    }

    ///disallow bond
    function disallowBond() onlyOwner {
        bondAllow = false;
    }

    ///allow unbond
    function allowUnbond() onlyOwner {
        unbondAllow = true;
    }

    ///disallow unbond
    function disallowUnbond() onlyOwner {
        unbondAllow = false;
    }

}
