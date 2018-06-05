pragma solidity ^0.4.19;

import "../lib/Destructible.sol";

contract RegistryStorage is Ownable {

    struct PiecewisePiece{
        int[] constants;
        uint[] parts;
        uint[] dividers;
    }

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => PiecewisePiece) curves; // Price vs Supply (contract endpoint)
    }

    mapping(address => Oracle) private oracles;
    address[] private oracleIndex;

    /**** Get Methods ****/

    /// @dev get public key of provider
    function getPublicKey(address provider) external view returns (uint256) {
        return oracles[provider].publicKey;
    }

    /// @dev get title of provider
    function getTitle(address provider) external view returns (bytes32) {
        return oracles[provider].title;
    }

    /// @dev get endpoint params length
    function getEndpointIndexSize(address provider, bytes32 endpoint) external view returns (uint256) {
        return oracles[provider].endpointParams[endpoint].length;
    }

    /// @dev get endpoint param by index
    function getEndPointParam(address provider, bytes32 endpoint, uint256 index) external view returns (bytes32) {
        return oracles[provider].endpointParams[endpoint][index];
    }

    function getCurveUnset(address provider, bytes32 endpoint) returns (bool) {
        return oracles[provider].curves[endpoint].parts.length==0;
    }

    /// @dev get curve constants, parts and dividers arrays
    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (int[],uint[],uint[])
    {
        PiecewisePiece memory pieces = oracles[provider].curves[endpoint];
        require(pieces.parts.length>0);

    return (pieces.constants, pieces.parts, pieces.dividers);

    }

    /// @dev get length of constants, parts and dividers arrays
    function getProviderArgsLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint,uint,uint)
    {
        return (oracles[provider].curves[endpoint].constants.length,
        oracles[provider].curves[endpoint].parts.length,
        oracles[provider].curves[endpoint].dividers.length);

    }

    /// @dev get overall number of providers
    function getOracleIndexSize() external view returns (uint256) {
        return oracleIndex.length;
    }

    /// @dev get provider address by index
    function getOracleAddress(uint256 index) external view returns (address) {
        return oracleIndex[index];
    }

    /**** Set Methods ****/

    ///  @dev add new provider to mapping
    function createOracle(address origin, uint256 publicKey, bytes32 title) external onlyOwner {
        oracles[origin] = Oracle(publicKey, title);
    }

    /// @dev add new provider address to oracles array
    function addOracle(address origin) external onlyOwner {
        oracleIndex.push(origin);
    }

    /// @dev set endpoint params of provider
    function setEndpointParameters(
        address origin,
        bytes32 endpoint,
        bytes32[] endpointParams
    )
        external
        onlyOwner

    {
        oracles[origin].endpointParams[endpoint] = endpointParams;
    }


    /// @dev initialize new curve for provider
    /// @param origin address of provider
    /// @param endpoint endpoint specifier
    /// @param constants flattened array of all coefficients/powers/function across all polynomial terms, [c0,p0,fn0, c1,p1,fn1 ...]
    /// @param parts array of starting/ending points for piecewise function pieces [start0,end0,start1,end1...]
    /// @param dividers array of indices, each specifying range of indices in coef, power, fn belonging to each piece
    function setCurve(
        address origin,
        bytes32 endpoint,
        int[] constants,
        uint[] parts,
        uint[] dividers
    )
        external
        onlyOwner
    {
        require(dividers[dividers.length-1]==constants.length/3);
        require((parts.length/2)==dividers.length);

        PiecewisePiece storage pieces = oracles[origin].curves[endpoint];
        pieces.constants = constants;
        pieces.parts = parts;
        pieces.dividers = dividers;

    }
}
