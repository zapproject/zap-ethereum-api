pragma solidity ^0.4.19;

import "../lib/Destructible.sol";
import "../lib/PiecewiseStorage.sol";

contract RegistryStorage is Ownable {

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => PiecewiseStorage.PiecewiseFunction) curves; // Price vs Supply (contract endpoint)
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
        return oracles[provider].curves[endpoint].pieces.length == 0; 
    }

    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (int[25], int[25], int[25], uint[5], uint[5], uint[5])
    {
        PiecewiseStorage.PiecewiseFunction memory curve = oracles[provider].curves[endpoint];

        uint[5][2] memory startsAndEnds;

        int[25][3] memory coefPowerFn;

        for (uint i = 0; i < curve.pieces.length; i++) {

            for (uint j = 0; j < curve.pieces[i].poly.terms.length; j++) {
                coefPowerFn[0][j] = curve.pieces[i].poly.terms[j].coef;
                coefPowerFn[1][j] = curve.pieces[i].poly.terms[j].power;
                coefPowerFn[2][j] = curve.pieces[i].poly.terms[j].fn;
            }

            startsAndEnds[0][i] = curve.pieces[i].start;
            startsAndEnds[1][i] = curve.pieces[i].end;
        }

        return (coefPowerFn[0], coefPowerFn[1], coefPowerFn[2], startsAndEnds[0], startsAndEnds[1], curve.dividers);
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
        int[25] coef,
        int[25] power,
        int[25] fn,
        uint[5] starts,
        uint[5] ends,
        uint[5] dividers
    ) 
        external
        onlyOwner
    {
        PiecewiseStorage.PiecewiseFunction storage pfunc = oracles[origin].curves[endpoint];
        PiecewiseStorage.PiecewiseFunction memory decoded = PiecewiseStorage.decodeCurve(coef, power, fn, starts, ends, dividers);
        pfunc.pieces[0] = decoded.pieces[0];
        pfunc.dividers = decoded.dividers;
    }


    // TODO:
    function writePiecewiseFunction() internal {

    }

}
