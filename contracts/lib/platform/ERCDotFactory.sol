import "../token/TokenFactoryInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "../../platform/registry/RegistryInterface.sol";

contract ERCDotFactory is Ownable {

    FactoryTokenInterface reserveToken;
    ZapCoordinatorInterface coord;
    TokenFactoryInterface public tokenFactory;


    mapping(bytes32 => address) curves;

    event DotTokenCreated(address tokenAddress);

    constructor(address coordinator, address factory){
        coord = ZapCoordinatorInterface(coordinator); 
        reserveToken = FactoryTokenInterface(coord.getContract("ZAP_TOKEN"));
        reserveToken.approve(coord.getContract("BONDAGE"), ~uint256(0));
        tokenFactory = TokenFactoryInterface(factory);
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
        if(!registry.isProviderInitiated(address(this))) {
            registry.initiateProvider(providerPubKey, providerTitle);
        }

        registry.initiateProviderCurve(specifier, curve, address(this));
        curves[specifier] = newToken(bytes32ToString(specifier), bytes32ToString(symbol));

        DotTokenCreated(curves[specifier]);
        return curves[specifier];
    }

    event Testing(address _address1, address address2,uint _quant1, uint _quant2);
    event TestInt(uint q);

    //overload for custom bond behaviour
    //whether this contract holds tokens or coming from wallet,etc
    function bond(address wallet, bytes32 specifier, uint numDots) internal {
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint256 issued = bondage.getDotsIssued(address(this), specifier);

        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint256 numReserve = cost._costOfNDots(address(this), specifier, issued + 1, numDots - 1);

        require(reserveToken.transferFrom(wallet, this, numReserve), "Error: User must have approved contract to transfer dot token");

        reserveToken.approve(address(bondage), numReserve);
        bondage.bond(address(this), specifier, numDots);

        FactoryTokenInterface(curves[specifier]).mint(wallet, numDots);
    }    

    //overload for custom bond behaviour
    //whether this contract holds tokens or coming from msg.sender,etc
    function unbond(address wallet, bytes32 specifier, uint numDots) internal {
        BondageInterface bondage = BondageInterface(coord.getContract("BONDAGE"));
        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));

        // Get the value of the dots
        uint256 issued = bondage.getDotsIssued(address(this), specifier);
        uint256 numReserve = cost._costOfNDots(address(this), specifier, issued + 1 - numDots, numDots - 1);

        bondage.unbond(address(this), specifier, numDots);
        FactoryTokenInterface(curves[specifier]).burnFrom(wallet, numDots);
        reserveToken.transfer(wallet, numReserve);
    }    

    function newToken(
        string name,
        string symbol
    ) 
        public
        returns (address tokenAddress) 
    {
        FactoryTokenInterface token = tokenFactory.create(name, symbol);
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
