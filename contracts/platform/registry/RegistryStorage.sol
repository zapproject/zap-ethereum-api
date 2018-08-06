pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";

contract RegistryStorage is Ownable {

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => int[]) curves;                // Endpoint to Curve definition
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

    function getCurveUnset(address provider, bytes32 endpoint) public view returns (bool) {
        return oracles[provider].curves[endpoint].length == 0;
    }

    /// @dev get curve array for this provider/endpoint
    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (int[])
    {   
        if(getCurveUnset(provider, endpoint)) revert();
        return oracles[provider].curves[endpoint];
    }

    /// @dev get length of curve array
    function getProviderArgsLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint)
    {
        return oracles[provider].curves[endpoint].length;
    }

    /// @dev get overall number of providers
    function getOracleIndexSize() external view returns (uint256) {
        return oracleIndex.length;
    }

    /// @dev get provider address by index
    function getOracleAddress(uint256 index) external view returns (address) {
        return oracleIndex[index];
    }

    /// @dev get all oracle addresses
    function getAllOracles() external view returns (address[]){
        return oracleIndex;
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
    /// @param curve flattened array of all segments, coefficients across all polynomial terms, [e0,l0,c0,c1,c2,...]
    function setCurve(
        address origin,
        bytes32 endpoint,
        int[] curve
    )
        external
        onlyOwner
    {
        // TODO: CHECK VALIDITY OF CURVE

        uint256 prevEnd;
        uint i=0;
        while(i < curve.length){
            int len = curve[i];
            require(len > 0);
            int end = curve[i+uint(len)+1];
            require(end > 0);
            require(uint(end) > prevEnd);
            prevEnd = uint(end);
            i += uint(len) + 2; 
        }

        oracles[origin].curves[endpoint] = curve;
    }
}
