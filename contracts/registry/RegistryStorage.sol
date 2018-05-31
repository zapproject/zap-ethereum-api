pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

import "../lib/Destructible.sol";
import "../lib/PiecewiseStorage.sol";

contract RegistryStorage is Ownable {

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => PiecewiseStorage.PiecewisePiece[]) curves; // Price vs Supply (contract endpoint)
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
        return oracles[provider].curves[endpoint].length == 0;
    }

    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (PiecewiseStorage.PiecewisePiece[] curve)
    {
        return oracles[provider].curves[endpoint];

    }

    function getPieceLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint)
    {
        return oracles[provider].curves[endpoint].length;

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
        PiecewiseStorage.decodeCurve(
            constants,
            parts,
            dividers,
            oracles[origin].curves[endpoint]
        );
    }
}
