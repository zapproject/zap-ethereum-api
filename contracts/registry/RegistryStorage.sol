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
        returns (int[], int[], int[], uint[], uint[], uint[])
    {
        PiecewiseStorage.PiecewiseFunction memory curve = oracles[provider].curves[endpoint];

        uint[] memory starts = new uint[](curve.pieces.length);
        uint[] memory ends = new uint[](curve.pieces.length);

        uint numTerms;
        uint pStart = 0;
        for ( uint i = 0; i < curve.dividers.length; i++ ) {
            
            uint pEnd = i;
            numTerms += pEnd - pStart +1;
        } 

        int[] memory coef = new int[](numTerms);
        int[] memory power = new int[](numTerms);
        int[] memory fn = new int[](numTerms);

        for ( i = 0; i < curve.pieces.length; i++ ){

            for ( uint j = 0; j < curve.pieces[i].poly.terms.length; j++ ) {
                coef[j] = curve.pieces[i].poly.terms[j].coef;
                power[j] = curve.pieces[i].poly.terms[j].power;
                fn[j] = curve.pieces[i].poly.terms[j].fn;
           }

           starts[i] = curve.pieces[i].start;
           ends[i] = curve.pieces[i].end;
        }
    
        return (coef, power, fn, starts, ends, curve.dividers);
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
        int[] coef,
        int[] power,
        int[] fn,
        uint[] starts,
        uint[] ends,
        uint[] dividers
    ) 
        external
        onlyOwner
    {
        oracles[origin].curves[endpoint] = PiecewiseStorage.decodeCurve(coef, power, fn, starts, ends, dividers);
    }



}
