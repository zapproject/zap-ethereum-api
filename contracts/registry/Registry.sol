pragma solidity ^0.4.19;
// v1.0

import "./../lib/Destructible.sol";
import "./RegistryStorage.sol";

contract Registry is Destructible {

    event NewProvider(
        address indexed provider,
        bytes32 indexed title,
        bytes32 indexed endpoint
    );

    event NewCurve(
        address indexed provider,
        bytes32 indexed endpoint,
        RegistryStorage.CurveType indexed curveType,
        uint128 curveStart,
        uint128 curveMultiplier
    );

    RegistryStorage stor;

    address public storageAddress;

    function Registry(address _storageAddress) public {
        storageAddress = _storageAddress;
        stor = RegistryStorage(_storageAddress);
    }

    /// @dev initiates a provider.
    /// If no address->Oracle mapping exists, Oracle object is created
    /// @param publicKey unique id for provider. used for encyrpted key swap for subscription endpoints
    /// @param title name
    /// @param endpoint specifier 
    /// @param endpointParams endpoint specific params
    function initiateProvider(
        uint256 publicKey,
        bytes32 title, 
        bytes32 endpoint,
        bytes32[] endpointParams
    )
        public
        returns (bool)
    {
        require(getProviderPublicKey(msg.sender) == 0);
        stor.createOracle(msg.sender, publicKey, title);
        if(endpoint != 0) setEndpointParams(endpoint, endpointParams);
        stor.addOracle(msg.sender);
        NewProvider(msg.sender, title, endpoint);
        return true;
    }

    /// @dev initiates an endpoint specific provider curve
    /// If oracle[specfifier] is uninitialized, Curve is mapped to endpoint
    /// @param endpoint specifier of endpoint. currently "smart_contract" or "socket_subscription"
    /// @param curveType dot-cost vs oracle-specific dot-supply
    /// @param curveStart y-offset of cost( always initial cost )
    /// @param curveMultiplier coefficient to curveType
    function initiateProviderCurve(
        bytes32 endpoint,
        RegistryStorage.CurveType curveType,
        uint128 curveStart,
        uint128 curveMultiplier
    )
        public
        returns (bool)
    {
        // Provider must be initiated
        require(stor.getPublicKey(msg.sender) != 0);
        // Can't use None
        require(curveType != RegistryStorage.CurveType.None);
        // Can't reset their curve
        RegistryStorage.CurveType cType;
        (cType,) = stor.getCurve(msg.sender, endpoint);
        require(cType == RegistryStorage.CurveType.None);
        stor.setCurve(msg.sender, endpoint, curveType, curveStart, curveMultiplier);
        NewCurve(msg.sender, endpoint, curveType, curveStart, curveMultiplier);
        return true;
    }

    function setEndpointParams(bytes32 endpoint, bytes32[] endpointParams) public {
        stor.setEndpointParameters(msg.sender, endpoint, endpointParams);
    }

    /// @return public key
    function getProviderPublicKey(address provider) public view returns (uint256) {
        return stor.getPublicKey(provider);
    }

    /// @return oracle name
    function getProviderTitle(address provider) public view returns (bytes32) {
        return stor.getTitle(provider);
    }

    /// @return endpoint-specific parameter
    function getNextEndpointParam(address provider, bytes32 endpoint, uint256 index)
        public
        view
        returns (uint256 nextIndex, bytes32 endpointParam)
    {
        uint256 len = stor.getEndpointIndexSize(provider, endpoint);
        if (index < len) {
            endpointParam = stor.getEndPointParam(provider, endpoint, index);
            if (index + 1 < len) return (index + 1, endpointParam);
            return (0, endpointParam);
        }
        return(0,0);
    }

    /// @dev get curve paramaters from oracle
    function getProviderCurve(
        address provider,
        bytes32 endpoint
    )        
        public
        view
        returns (
            RegistryStorage.CurveType curveType,
            uint128 curveStart,
            uint128 curveMultiplier
        )
    {
        return stor.getCurve(provider, endpoint);
    }

    function getNextProvider(uint256 index)
        public
        view
        returns (uint256 nextIndex, address oracleAddress, uint256 publicKey, bytes32 title)      
    {
        uint256 len = stor.getOracleIndexSize();
        if (index < len) {
            oracleAddress = stor.getOracleAddress(index);
            if (index + 1 < len)
                return (
                    index + 1, 
                    oracleAddress, 
                    getProviderPublicKey(oracleAddress), 
                    getProviderTitle(oracleAddress)
                );            
            return (
                0, 
                oracleAddress, 
                getProviderPublicKey(oracleAddress), 
                getProviderTitle(oracleAddress)
            );
        }
        return (0,0x0,0,"");
    }
}
