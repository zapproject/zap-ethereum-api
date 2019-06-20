pragma solidity ^0.5.0;

import "../token/TokenFactoryInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";

contract TokenDotFactory is Ownable {

    CurrentCostInterface currentCost;
    FactoryTokenInterface public reserveToken;
    ZapCoordinatorInterface public coord;
    TokenFactoryInterface public tokenFactory;
    BondageInterface bondage;

    mapping(bytes32 => address) public curves;

    event DotTokenCreated(address tokenAddress);

    constructor(
        address coordinator, 
        address factory,
        uint256 providerPubKey,
        bytes32 providerTitle 
    ) public {
        coord = ZapCoordinatorInterface(coordinator); 
        reserveToken = FactoryTokenInterface(coord.getContract("ZAP_TOKEN"));
        //always allow bondage to transfer from wallet
        reserveToken.approve(coord.getContract("BONDAGE"), ~uint256(0));
        tokenFactory = TokenFactoryInterface(factory);

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        registry.initiateProvider(providerPubKey, providerTitle);
    }

    function initializeCurve(
        bytes32 specifier, 
        bytes32 symbol, 
        int256[] memory curve
    ) public returns(address) {
        
        require(curves[specifier] == address(0), "Curve specifier already exists");
        
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        require(registry.isProviderInitiated(address(this)), "Provider not intiialized");

        registry.initiateProviderCurve(specifier, curve, address(this));
        curves[specifier] = newToken(bytes32ToString(specifier), bytes32ToString(symbol));
        
        registry.setProviderParameter(specifier, toBytes(curves[specifier]));
        
        emit DotTokenCreated(curves[specifier]);
        return curves[specifier];
    }


    event Bonded(bytes32 indexed specifier, uint256 indexed numDots, address indexed sender); 

    //whether this contract holds tokens or coming from msg.sender,etc
    function bond(bytes32 specifier, uint numDots) public  {

        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint256 issued = bondage.getDotsIssued(address(this), specifier);

        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint256 numReserve = cost._costOfNDots(address(this), specifier, issued + 1, numDots - 1);

        require(
            reserveToken.transferFrom(msg.sender, address(this), numReserve),
            "insufficient accepted token numDots approved for transfer"
        );

        reserveToken.approve(address(bondage), numReserve);
        bondage.bond(address(this), specifier, numDots);
        FactoryTokenInterface(curves[specifier]).mint(msg.sender, numDots);
        emit Bonded(specifier, numDots, msg.sender);

    }

    event Unbonded(bytes32 indexed specifier, uint256 indexed numDots, address indexed sender); 

    //whether this contract holds tokens or coming from msg.sender,etc
    function unbond(bytes32 specifier, uint numDots) public {

        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - numDots, numDots - 1);

        //unbond dots
        bondage.unbond(address(this), specifier, numDots);
        //burn dot backed token
        FactoryTokenInterface curveToken = FactoryTokenInterface(curves[specifier]);
        curveToken.burnFrom(msg.sender, numDots);

        require(reserveToken.transfer(msg.sender, reserveCost), "Error: Transfer failed");
        emit Unbonded(specifier, numDots, msg.sender);

    }

    function newToken(
        string memory name,
        string memory symbol
    ) 
        public
        returns (address tokenAddress) 
    {
        FactoryTokenInterface token = tokenFactory.create(name, symbol);
        tokenAddress = address(token);
        return tokenAddress;
    }

    function getTokenAddress(bytes32 specifier) public view returns(address) {
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        return bytesToAddr(registry.getProviderParameter(address(this), specifier));
    }

    // https://ethereum.stackexchange.com/questions/884/how-to-convert-an-address-to-bytes-in-solidity
    function toBytes(address x) public pure returns (bytes memory b) {
        b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
    }

    //https://ethereum.stackexchange.com/questions/2519/how-to-convert-a-bytes32-to-string
    function bytes32ToString(bytes32 x) public pure returns (string memory) {
        bytes memory bytesString = new bytes(32);

        bytesString = abi.encodePacked(x);

        return string(bytesString);
    }

    //https://ethereum.stackexchange.com/questions/15350/how-to-convert-an-bytes-to-address-in-solidity
    function bytesToAddr (bytes memory bys) public pure returns (address) {
        address addr = address(0);

         assembly {
      addr := mload(add(bys,20))
    } 
        return address(addr);
    }


}

