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

    function getCurveUnset(address provider, bytes32 endpoint) returns (bool) {
        return true;
    }

    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (int[],uint[],uint[])
    {
        PiecewisePiece memory pieces = oracles[provider].curves[endpoint];

        return (pieces.constants, pieces.parts, pieces.dividers);

    }

    function getProviderArgsLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint,uint,uint)
    {
        return (oracles[provider].curves[endpoint].constants.length,
        oracles[provider].curves[endpoint].parts.length,
        oracles[provider].curves[endpoint].dividers.length);

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
