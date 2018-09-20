import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../token/FactoryToken.sol";

contract ERCDotFactory is Ownable{

    FactoryToken reserveToken;
    ZapCoordinatorInterface coord;
    mapping(bytes32 => address) curves;

    constructor(address coordinator){
        coord = ZapCoordinatorInterface(coordinator); 
        reserveToken = FactoryToken(coord.getContract("ZAP_TOKEN"));
        reserveToken.approve(coord.getContract("BONDAGE"), ~uint256(0)); 
    }

    function initializeCurve(
        uint256 providerPubKey,
        bytes32 providerTitle, 
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] curve
    ) returns(address) {

        require(curves[specifier] == 0, "Curve specifier already exists");

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        if(!registry.isProviderInitiated(msg.sender)) {
            registry.initiateProvider(providerPubKey, providerTitle);
        }

        registry.initiateProviderCurve(specifier, curve, address(this));
        curves[specifier] = newFactoryToken(bytes32ToString(specifier), bytes32ToString(symbol)); 
        return curves[specifier];
    }

    function bond(address wallet, bytes32 specifier, uint quantity) internal {
        //overload for custom bond behaviour
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE")); 
        bondage.bond(address(this), specifier, quantity);
        FactoryToken(curves[specifier]).mint(wallet, quantity);
    }    

    function unbond(address wallet, bytes32 specifier, uint quantity) internal {
        //overload for custom unbond behaviour
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE")); 
        bondage.unbond(address(this), specifier, quantity);
        FactoryToken(curves[specifier]).burnFrom(wallet, quantity);
    }    

    function newFactoryToken(
        string name,
        string symbol
    ) 
        internal 
        returns (address tokenAddress) 
    {
        FactoryToken token = new FactoryToken(name, symbol);
        token.transferOwnership(address(this));
        tokenAddress = address(token);
        return tokenAddress;
    }


    //https://ethereum.stackexchange.com/questions/2519/how-to-convert-a-bytes32-to-string
    function bytes32ToString(bytes32 x) constant returns (string) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }


}
