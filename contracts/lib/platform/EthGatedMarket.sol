import "./EthAdapter.sol";
//send eth to obtain market token
//use market token to bond to gated markets
//child contracts can control gate unbonding 

contract EthGatedMarket is EthAdapter{

    bool public bondAllow;
    bool public unbondAllow;

    Token reserveToken;//zap
    Token gatewayToken;//token used to bond in gated markets
    TokenAdapter marketFactory;//factory for gated curves  

    constructor(address coordinator)
    EthAdapter(coordinator) {

        bondAllow = false;
        unbondAllow = false;
    }

    ///initiallize gateway eth->gateway token curve, set exchange rate of eth/reserve token 
    function initializeGateway( 
        bytes32 title, 
        bytes32 pubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve,
        int256 adapterRate
        ) ownerOnly {

        gatewayToken = Token(
            initializeCurve(
                title, pubKey, specifier, symbol, curve
            )
        );

        gatewaySpecifier = specifier;
        setAdapterRate(adapterRate); 
        marketFactory = new TokenAdapter(coordinator, address(gatewayToken)); 
        bondAllow = true; 
    } 

    ///bond to obtain gateway tokens in exchange for eth, able to bond to gated curves
    function gatewayBond(numDots) public payable {
        
        require(bondAllow, "bond not allowed");
        super.bond(address(this), gatewaySpecifier, numDots)
    }  

    ///unbond to obtain eth in exchange for gateway tokens
    function gatewayUnbond(bondQuantity) public {

        require(unbondAllow, "unbond not allowed");
        super.unbond(address(this), gatewaySpecifier, numDots)
    }

    ///initialize a new gated market
    function initializeMarketCurve(
        bytes32 title, 
        bytes32 pubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve,
    ) public {

        marketFactory.initializeCurve(    
            title, pubKey, specifier, symbol, curve
        );
    }
    
    ///bond to gated market with gateway token
    function marketBond(bytes32 specifier, uint numDots) {
        
        marketFactory.bond(address(this), specifier, numDots); 
    }

    ///unbond from gated market with gateway token
    function marketUnbond(bytes32 specifier, uint numDots) {

        marketFactory.unbond(address(this), specifier, numDots);
    }

    ///allow unbond
    function allowUnbond() ownerOnly {  
        unbond = true; 
    }

    ///disallow unbond
    function disallowUnbond() ownerOnly {  
        unbond = false;
    }

