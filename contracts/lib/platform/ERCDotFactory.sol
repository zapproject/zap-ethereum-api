import "../lib/ownership/Ownable.sol";
import "../lib/ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../lib/token/Token.sol";

contract ERCDotFactory is Ownable{

    mapping(bytes32 => address) curves;
    address coord;
    address reserveToken;

    constructor(address coordinator){
        coord = ZapCoordinator(coordinator); 
        reserveToken = Token(coordinator.getContract("ZAP_TOKEN");
        reserveToken.approve(coord.getContract("BONDAGE"), ~uint256(0)); 
    }

    function initializeCurve(
        bytes32 providerTitle, 
        bytes32 providerPubKey,
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve
    ) returns(address) {

        require(curves[specifier] == 0, "Curve specifier already exists");

        if(!registry.isProviderInitiated(msg.sender)) {
            Registry reg = RegistryInterface(coord.getContract("REGISTRY")); 
            registry.initiateProvider(gatewayPubKey, gatewayTitle);
        }

        gatewaySpecifier = _gatewaySpecifier; 
        gatewaySymbol = _gatewaySymbol; 
        registry.initiateProviderCurve(specifier, curve, address(this));
        curves[specifier] = newToken(specifier, symbol); 
        return curves[specifier];
    }

    function mint(address wallet, bytes32 specifier, uint quantity) internal {
        Token(curves[specifier]).mint(wallet, quantity);
    }

    function burn(address wallet, bytes32 specifier, uint quantity) internal {
        require(Token(curves[specifier]).burnFrom(wallet, quantity), "quantity not approved");
    }

    function bond(address wallet, bytes32 specifier, uint numDots) internal {
        //overload for custom bond behaviour
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        bondage.bond(address(this), specifier, numDots);
        mint(wallet, specifier, numDots);
    }    

    function unbond(address wallet, bytes32 specifier, uint numDots) internal {
        //overload for custom unbond behaviour
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        bondage.unbond(address(this), specifier, numDots);
        burn(wallet, specifier, numDots); 
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
