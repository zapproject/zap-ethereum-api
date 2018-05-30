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
        bytes32 indexed endpoint
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

    // just set isInitialized flag
    // new push and pop functions should be used to specify params
    function initiateProviderCurve(
        bytes32 endpoint
    )
        public
        returns (bool)
    {
        // Provider must be initiated
        require(stor.getPublicKey(msg.sender) != 0);
        // Can't reset their curve
        require(stor.getCurveUnset(msg.sender, endpoint));

        stor.setCurve(msg.sender, endpoint);
        NewCurve(msg.sender, endpoint);

        return true;
    }

    function pushCurveFunctionPiece(bytes32 endpoint, uint start, uint end) external returns(bool) {
        stor.pushFunctionPiece(msg.sender, endpoint, start, end);
        return true;
    }

    function pushCurveFunctionDivider(bytes32 endpoint, uint divider) external returns(bool) {
        stor.pushFunctionDivider(msg.sender, endpoint, divider);
        return true;
    }

    function pushCurvePieceTerm(bytes32 endpoint, uint64 pieceNum, int coef, int power, int fn) external returns(bool) {
        stor.pushPieceTerm(msg.sender, endpoint, pieceNum, coef, power, fn);
        return true;
    }

    function popCurveFunctionPiece(bytes32 endpoint) external returns(bool) {
        stor.popFunctionPiece(msg.sender, endpoint);
        return true;
    }

    function popCurveFunctionDivider(bytes32 endpoint) external returns(bool) {
        stor.popFunctionDivider(msg.sender, endpoint);
        return true;
    }

    function popCurvePieceTerm(bytes32 endpoint, uint64 pieceNum) external returns(bool) {
        stor.popPieceTerm(msg.sender, endpoint, pieceNum);
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

    function getCurvePiecesLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint64)
    {
        return stor.getCurvePiecesLength(provider, endpoint);
    }

    function getCurveDividersLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint64)
    {
        return stor.getCurveDividersLength(provider, endpoint);
    }

    function getCurveDivider(address provider, bytes32 endpoint, uint64 dividerNum)
        external
        view
        returns (uint)
    {
        return stor.getCurveDivider(provider, endpoint, dividerNum);
    }

    function getCurvePieceInfo(address provider, bytes32 endpoint, uint64 pieceNum)
        external
        view
        returns (uint start, uint end, uint64 termsLength)
    {
        return stor.getCurvePieceInfo(provider, endpoint, pieceNum);
    }

    function getCurveTerm(address provider, bytes32 endpoint, uint64 pieceNum, uint64 termNum)
        external
        view
        returns (int coef, int power, int fn)
    {
        return stor.getCurveTerm(provider, endpoint, pieceNum, termNum);
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
