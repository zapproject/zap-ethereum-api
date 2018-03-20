pragma solidity ^0.4.17;
// v1.0

/* ******************************************************************
/* MAKE SURE TO transferOwnership TO Registry Contract UPON DEPLOYMENT
/* ******************************************************************/

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
        uint256 public_key;                              // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpoint_params;   // Endpoint specific parameters
        mapping(bytes32 => Curve) curves;                // Price vs Supply (contract endpoint)
    }

    mapping(address => Oracle) private oracles;
    address[] private oracleIndex;

    /**** Get Methods ****/

    function getPublicKey(address provider) external view returns (uint256) {
        return oracles[provider].public_key;
    }

    function getTitle(address provider) external view returns (bytes32) {
        return oracles[provider].title;
    }

    function getEndpointIndexSize(address provider, bytes32 specifier) external view returns (uint256) {
        return oracles[provider].endpoint_params[specifier].length;
    }    

    function getEndPointParam(address provider, bytes32 specifier, uint256 index) external view returns (bytes32) {
        return oracles[provider].endpoint_params[specifier][index];
    }

    function getCurve(address provider, bytes32 specifier)
        external
        view
        returns (CurveType Type, uint128 Start, uint128 Multiplier)
    {
        Curve memory curve = oracles[provider].curves[specifier];

        return (curve.Type, curve.Start, curve.Multiplier);
    }

    function getOracleIndexSize() external view returns (uint256) {
        return oracleIndex.length;
    }

    function getOracleAddress(uint256 index) external view returns (address) {
        return oracleIndex[index];
    }

    /**** Set Methods ****/

    function createOracle(address origin, uint256 public_key, bytes32 title) external onlyOwner {
        oracles[origin] = Oracle(public_key, title);
    }

    function addOracle(address origin) external onlyOwner {
        oracleIndex.push(origin);
    }

    function setEndpointParameters(
        address origin,
        bytes32 specifier,
        bytes32[] endpoint_params
    )
        external
        onlyOwner

    {
        oracles[origin].endpoint_params[specifier] = endpoint_params;
    }

    function setCurve(
        address origin,
        bytes32 specifier,
        CurveType curveType,
        uint128 curveStart,
        uint128 curveMultiplier
    ) 
        external
        onlyOwner

    {
        oracles[origin].curves[specifier].Type = curveType;
        oracles[origin].curves[specifier].Start = curveStart;
        oracles[origin].curves[specifier].Multiplier = curveMultiplier;
    }
}