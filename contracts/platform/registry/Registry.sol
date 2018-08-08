pragma solidity ^0.4.24;
// v1.0

import "../../lib/lifecycle/Destructible.sol";
import "../../lib/ownership/Upgradable.sol";
import "../database/DatabaseInterface.sol";
import "./RegistryInterface.sol";

contract Registry is Destructible, RegistryInterface, Upgradable {

    event NewProvider(
        address indexed provider,
        bytes32 indexed title,
        bytes32 indexed endpoint
    );

    event NewCurve(
        address indexed provider,
        bytes32 indexed endpoint,
        int[] curve
    );

    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
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
        require(!isProviderInitiated(msg.sender));
        createOracle(msg.sender, publicKey, title);
        if(endpoint != 0) setEndpointParams(endpoint, endpointParams);
        addOracle(msg.sender);
        emit NewProvider(msg.sender, title, endpoint);
        return true;
    }

    /// @dev initiates an endpoint specific provider curve
    /// If oracle[specfifier] is uninitialized, Curve is mapped to endpoint
    /// @param endpoint specifier of endpoint. currently "smart_contract" or "socket_subscription"
    /// @param curve flattened array of all segments, coefficients across all polynomial terms, [e0,l0,c0,c1,c2,...]
    function initiateProviderCurve(
        bytes32 endpoint,
        int256[] curve
    )
        public
        returns (bool)
    {
        // Provider must be initiated
        require(isProviderInitiated(msg.sender));
        // Can't reset their curve
        require(getCurveUnset(msg.sender, endpoint));

        setCurve(msg.sender, endpoint, curve);
        emit NewCurve(msg.sender, endpoint, curve);

        return true;
    }

    function setEndpointParams(bytes32 endpoint, bytes32[] endpointParams) public {
        setEndpointParameters(msg.sender, endpoint, endpointParams);
    }

    /// @return public key
    function getProviderPublicKey(address provider) public view returns (uint256) {
        return getPublicKey(provider);
    }

    /// @return oracle name
    function getProviderTitle(address provider) public view returns (bytes32) {
        return getTitle(provider);
    }

    /// @return endpoint-specific parameter
    function getNextEndpointParam(address provider, bytes32 endpoint, uint256 index)
        public
        view
        returns (uint256 nextIndex, bytes32 endpointParam)
    {
        uint256 len = getEndpointIndexSize(provider, endpoint);
        if (index < len) {
            endpointParam = getEndPointParam(provider, endpoint, index);
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
        returns (int[])
    {

        return getCurve(provider, endpoint);
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
        uint256 len = getOracleIndexSize();
        if (index < len) {
            oracleAddress = getOracleAddress(index);
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

    /// @dev is provider initiated
    /// @param oracleAddress the provider address
    /// @return Whether or not the provider has initiated in the Registry.
    function isProviderInitiated(address oracleAddress) public view returns (bool) {
        return getProviderTitle(oracleAddress) != 0;
    }

    /*** STORAGE FUNCTIONS ***/
    /// @dev get public key of provider
    function getPublicKey(address provider) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked("oracles", provider, "publicKey")));
    }

    /// @dev get title of provider
    function getTitle(address provider) public view returns (bytes32) {
        return db.getBytes32(keccak256(abi.encodePacked("oracles", provider, "title")));
    }

    /// @dev get endpoint params length
    function getEndpointIndexSize(address provider, bytes32 endpoint) public view returns (uint256) {
        return db.getBytesArrayLength(keccak256(abi.encodePacked("oracles", provider, "endpointParams", endpoint)));
    }

    /// @dev get endpoint param by index
    function getEndPointParam(address provider, bytes32 endpoint, uint256 index) public view returns (bytes32) {
        return db.getBytesArrayIndex(keccak256(abi.encodePacked('oracles', provider, 'endpointParams', endpoint)), index);
    }

    /// @dev get curve array for this provider/endpoint
    function getCurve(address provider, bytes32 endpoint)
        public
        view
        returns (int[])
    {   
        if(getCurveUnset(provider, endpoint)) revert();
        return db.getIntArray(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint)));
    }

    /// @dev get length of curve array
    function getProviderArgsLength(address provider, bytes32 endpoint)
        public
        view
        returns (uint)
    {
        return db.getIntArrayLength(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint)));
    }

    function getCurveUnset(address provider, bytes32 endpoint) public view returns (bool) {
        return db.getIntArrayLength(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint))) == 0;
    }

    /// @dev get overall number of providers
    function getOracleIndexSize() public view returns (uint256) {
        return db.getAddressArrayLength(keccak256(abi.encodePacked('oracleIndex')));
    }

    /// @dev get provider address by index
    function getOracleAddress(uint256 index) public view returns (address) {
        return db.getAddressArrayIndex(keccak256(abi.encodePacked('oracleIndex')), index);
    }

    /// @dev get all oracle addresses
    function getAllOracles() external view returns (address[]) {
        return db.getAddressArray(keccak256(abi.encodePacked('oracleIndex')));
    }

    ///  @dev add new provider to mapping
    function createOracle(address origin, uint256 publicKey, bytes32 title) private {
        db.setNumber(keccak256(abi.encodePacked('oracles', origin, "publicKey")), uint256(publicKey));
        db.setBytes32(keccak256(abi.encodePacked('oracles', origin, "title")), title);
    }

    /// @dev add new provider address to oracles array
    function addOracle(address origin) private {
        db.pushAddressArray(keccak256(abi.encodePacked('oracleIndex')), origin);
    }

    /// @dev set endpoint params of provider
    function setEndpointParameters(
        address origin,
        bytes32 endpoint,
        bytes32[] endpointParams
    )   
        private
    {
        db.setBytesArray(keccak256(abi.encodePacked('oracles', origin, 'endpointParams', endpoint)), endpointParams);
    }


    /// @dev initialize new curve for provider
    /// @param origin address of provider
    /// @param endpoint endpoint specifier
    /// @param curve flattened array of all segments, coefficients across all polynomial terms, [l0,c0,c1,c2,..., ck, e0, ...]
    function setCurve(
        address origin,
        bytes32 endpoint,
        int[] curve
    )
        private
    {
        uint prevEnd = 1;
        uint index = 0;

        // Validate the curve
        while ( index < curve.length ) {
            // Validate the length of the piece
            int len = curve[index];
            require(len > 0);

            // Validate the end index of the piece
            uint endIndex = index + uint(len) + 1;
            require(endIndex < curve.length);

            // Validate that the end is continuous
            int end = curve[endIndex];
            require(uint(end) > prevEnd);

            prevEnd = uint(end);
            index += uint(len) + 2; 
        }

        db.setIntArray(keccak256(abi.encodePacked('oracles', origin, 'curves', endpoint)), curve);
    }
}
