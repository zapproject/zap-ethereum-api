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
        int[] constants,
        uint[] parts,
        uint[] dividers
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
    /// @param constants flattened array of all coefficients/powers/function across all polynomial terms
    /// @param parts array of starting/ending points for piecewise function pieces
    /// @param dividers array of indices, each specifying range of indices in coef,power,fn belonging to each piece
    function initiateProviderCurve(
        bytes32 endpoint,
        int[] constants,
        uint[] parts,
        uint[] dividers
    )
        public
        returns (bool)
    {
        // Provider must be initiated
        require(stor.getPublicKey(msg.sender) != 0);
        // Can't reset their curve
        require(stor.getCurveUnset(msg.sender, endpoint));

        stor.setCurve(msg.sender, endpoint, constants, parts, dividers);
        NewCurve(msg.sender,  endpoint, constants, parts, dividers);

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
        returns (int[], uint[],uint[])
    {
        return stor.getCurve(provider, endpoint);
    }

    /// @dev get length of constants, parts and dividers arrays
    function getProviderArgsLength(address provider, bytes32 endpoint)
        public
        view
        returns (uint, uint,uint)
    {
        return stor.getProviderArgsLength(provider, endpoint);

    }

    /// @dev get provider info
    /// @param index index of provider
    /// @return nextIndex next provider index
    /// @return oracleAddress provider address
    /// @return publicKey provider public key
    /// @return title provider title
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
