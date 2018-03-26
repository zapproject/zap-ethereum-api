pragma solidity ^0.4.21;
// v1.0

import "../aux/Mortal.sol";

contract RegistryStorage is Ownable {

    // curve types representing dot(access token) prices as function of supply
    enum CurveType { None, Linear, Exponential, Logarithmic }

    // curve data structure representing dot(access token) prices as function of supply
    struct Curve {
        CurveType Type;
        uint128 Start;
        uint128 Multiplier;
    }

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => Curve) curves;                // Price vs Supply (contract endpoint)
    }

    mapping(address => Oracle) private oracles;
    address[] private oracleIndex;

    /**** Get Methods ****/

    function getPublicKey(address provider) external view returns (uint256) {
        return oracles[provider].publicKey;
    }

    function getTitle(address provider) external view returns (bytes32) {
        return oracles[provider].title;
    }

    function getEndpointIndexSize(address provider, bytes32 endpoint) external view returns (uint256) {
        return oracles[provider].endpointParams[endpoint].length;
    }    

    function getEndPointParam(address provider, bytes32 endpoint, uint256 index) external view returns (bytes32) {
        return oracles[provider].endpointParams[endpoint][index];
    }

    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (CurveType Type, uint128 Start, uint128 Multiplier)
    {
        Curve memory curve = oracles[provider].curves[endpoint];

        return (curve.Type, curve.Start, curve.Multiplier);
    }

    function getOracleIndexSize() external view returns (uint256) {
        return oracleIndex.length;
    }

    function getOracleAddress(uint256 index) external view returns (address) {
        return oracleIndex[index];
    }

    /**** Set Methods ****/

    function createOracle(address origin, uint256 publicKey, bytes32 title) external onlyOwner {
        oracles[origin] = Oracle(publicKey, title);
    }

    function addOracle(address origin) external onlyOwner {
        oracleIndex.push(origin);
    }

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

    function setCurve(
        address origin,
        bytes32 endpoint,
        CurveType curveType,
        uint128 curveStart,
        uint128 curveMultiplier
    ) 
        external
        onlyOwner

    {
        oracles[origin].curves[endpoint] = Curve(curveType, curveStart, curveMultiplier);
    }
}
