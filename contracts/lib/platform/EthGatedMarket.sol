import "./EthAdapter.sol";
import "./TokenAdapter.sol";

//send eth to obtain market token
//use market token to bond to gated markets
//child contracts can control gate unbonding 

contract EthGatedMarket is EthAdapter {

    bool public bondAllow;
    bool public unbondAllow;
    bytes32 public gatewaySpecifier;

    //FactoryTokenInterface public reserveToken;//zap
    FactoryTokenInterface public gatewayToken;//token used to bond in gated markets
    TokenAdapter public marketFactory;//factory for gated curves

    constructor(address coordinator, address tokenFactory)
    EthAdapter(coordinator, tokenFactory, 1) {

        bondAllow = false;
        unbondAllow = false;
    }

    ///initiallize gateway eth->gateway token curve, set exchange rate of eth/reserve token 
    function initializeGateway( 
        bytes32 title, 
        uint256 pubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve,
        uint256 adapterRate
        ) returns(address){
        
        require(gatewaySpecifier == bytes32(0));
        gatewayToken = FactoryTokenInterface(
            initializeCurve(
                pubKey, title, specifier, symbol, curve
            )
        );

        gatewaySpecifier = specifier;
        setAdapterRate(adapterRate);
        bondAllow = true;
        return gatewayToken;    
    }

    function setMarket(TokenAdapter _market) onlyOwner {
        marketFactory = _market;
    }

    ///bond to obtain gateway tokens in exchange for eth, able to bond to gated curves
    function gatewayBond(uint quantity) public payable {

        require(bondAllow, "bond not allowed");
        super.bond(msg.sender, gatewaySpecifier, quantity);
    }  

    ///unbond to obtain eth in exchange for gateway tokens
    function gatewayUnbond(uint quantity) public {

        require(unbondAllow, "unbond not allowed");
        super.unbond(msg.sender, gatewaySpecifier, quantity);
    }

    ///initialize a new gated market
    function initializeMarketCurve(
        uint256 pubKey,
        bytes32 title, 
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve
    ) public returns(address) {
        return marketFactory.initializeCurve(    
            pubKey, title, specifier, symbol, curve
        );
    }
    
    ///bond to gated market with gateway token
    function marketBond(bytes32 specifier, uint quantity) {

        marketFactory.ownerBond(msg.sender, specifier, quantity);
    }

    ///unbond from gated market with gateway token
    function marketUnbond(bytes32 specifier, uint quantity) {

        marketFactory.ownerUnbond(msg.sender, specifier, quantity);
    }

    function allocateGatewayToken(address _to, uint256 _amount) external onlyOwner {
        gatewayToken.mint(_to, _amount);
    }

    ///allow bond
    function allowBond(bool _allow) onlyOwner {
        bondAllow = _allow;
    }

    ///allow unbond
    function allowUnbond(bool _allow) onlyOwner {
        unbondAllow = _allow;
    }
}
