pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";
import "../../lib/ownership/Upgradable.sol";
import "../database/DatabaseInterface.sol";

contract RegistryStorage is Ownable, Upgradable {
    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
    }

    /// @dev get public key of provider
    function getPublicKey(address provider) external view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked("oracles", provider, "publicKey")));
    }

    /// @dev get title of provider
    function getTitle(address provider) external view returns (bytes32) {
        return db.getBytes32(keccak256(abi.encodePacked("oracles", provider, "title")));
    }

    /// @dev get endpoint params length
    function getEndpointIndexSize(address provider, bytes32 endpoint) external view returns (uint256) {
        return db.getBytesArrayLength(keccak256(abi.encodePacked("oracles", provider, "endpointParams", endpoint)));
    }

    /// @dev get endpoint param by index
    function getEndPointParam(address provider, bytes32 endpoint, uint256 index) external view returns (bytes32) {
        return db.getBytesArrayIndex(keccak256(abi.encodePacked('oracles', provider, 'endpointParams', endpoint)), index);
    }

    /// @dev get curve array for this provider/endpoint
    function getCurve(address provider, bytes32 endpoint)
        external
        view
        returns (int[])
    {   
        if(getCurveUnset(provider, endpoint)) revert();
        return db.getIntArray(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint)));
    }

    /// @dev get length of curve array
    function getProviderArgsLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint)
    {
        return db.getIntArrayLength(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint)));
    }

    function getCurveUnset(address provider, bytes32 endpoint) public view returns (bool) {
        return db.getIntArrayLength(keccak256(abi.encodePacked('oracles', provider, 'curves', endpoint))) == 0;
    }

    /// @dev get overall number of providers
    function getOracleIndexSize() external view returns (uint256) {
        return db.getAddressArrayLength(keccak256(abi.encodePacked('oracleIndex')));
    }

    /// @dev get provider address by index
    function getOracleAddress(uint256 index) external view returns (address) {
        return db.getAddressArrayIndex(keccak256(abi.encodePacked('oracleIndex')), index);
    }

    /// @dev get all oracle addresses
    function getAllOracles() external view returns (address[]) {
        return db.getAddressArray(keccak256(abi.encodePacked('oracleIndex')));
    }

    ///  @dev add new provider to mapping
    function createOracle(address origin, uint256 publicKey, bytes32 title) external onlyOwner {
        db.setNumber(keccak256(abi.encodePacked('oracles', origin, "publicKey")), uint256(publicKey));
        db.setBytes32(keccak256(abi.encodePacked('oracles', origin, "title")), title);
    }

    /// @dev add new provider address to oracles array
    function addOracle(address origin) external onlyOwner {
        db.pushAddressArray(keccak256(abi.encodePacked('oracleIndex')), origin);
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
        external
        onlyOwner
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
