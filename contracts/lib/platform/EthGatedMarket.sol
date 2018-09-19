import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "./Token.sol";

contract EthGatedMarket is EthAdapter{

    bool public bondAllow;
    bool public unbondAllow;
    bytes32 gatewaySpecifier;
    bytes32 gatewaySymbol;

    Token reserveToken;
    Token gatewayToken;
    TokenAdapter marketFactory;    

    constructor(address coordinator){

        bondAllow = false;
        unbondAllow = false;
        EthAdapter(coordinator);
    }

    function initializeGateway( 
        bytes32 providerTitle, 
        bytes32 providerPubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve,
        int256 reserveRate
        ) ownerOnly {

        gatewayToken = Token(
            initializeCurve(
                address(this)
                providerTitle, 
                providerPubKey,
                specifier, 
                symbol, 
                curve
            )
        );

        gatewaySpecifier = specifier;
        setReserveAdapterRate(reserveRate); 

        marketFactory = TokenAdapter(coordinator, address(gatewayToken)); 
        
        bondAllow = true; 
    } 

    function gatewayBond(numDots) public payable {
        
        require(bondAllow, "bond not allowed");
        super.bond(address(this), gatewaySpecifier, numDots)
    }  

    function gatewayUnbond(bondQuantity) public {

        require(unbondAllow, "unbond not allowed");
        super.unbond(address(this), gatewaySpecifier, numDots)
    }

    function initializeMarketCurve(
        bytes32 providerTitle, 
        bytes32 providerPubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve,
    ) public {

        marketFactory.initializeCurve(    
            providerTitle, 
            providerPubKey,
            specifier, 
            symbol, 
            curve
        );
    }

    function marketBond(bytes32 specifier, uint numDots) {
        
        marketFactory.bond(address(this), specifier, numDots); 
    }

    function marketUnbond(bytes32 specifier, uint numDots) {

        marketFactory.unbond(address(this), specifier, numDots);
    }

    function openUnbond() ownerOnly {  
        unbond = true; 
    }

    function closeUnbond() ownerOnly {  
        unbond = false;
    }

    function newToken(
        string name,
        string symbol
    ) 
        internal 
        returns (address tokenAddress) 
    {
        Token token = new Token(name, symbol);
        token.transferOwnership(address(this));
        tokenAddress = address(token);
        return tokenAddress;
    }

}
