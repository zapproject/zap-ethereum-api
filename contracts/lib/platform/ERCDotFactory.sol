pragma solidity ^0.4.24;

import "../token/TokenFactoryInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "../../platform/registry/RegistryInterface.sol";

contract ERCDotFactory is Ownable {

    FactoryTokenInterface public reserveToken;
    ZapCoordinatorInterface public coord;
    TokenFactoryInterface public tokenFactory;


    mapping(bytes32 => address) public curves;

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

    }

    //overload for custom bond behaviour
    //whether this contract holds tokens or coming from msg.sender,etc
    function unbond(address wallet, bytes32 specifier, uint numDots) internal {

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

        bytesString = abi.encodePacked(x);

        return string(bytesString);
    }
}
