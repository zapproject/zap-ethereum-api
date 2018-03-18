pragma solidity ^0.4.17;
// v1.0

// Make sure to implement a setRegistryAddress fx in contracts that use this interface to support upgrades
// Technically an abstract contract, not interface (solidity compiler devs are working to fix this right now)

contract RegistryInterface {
	enum CurveType { None, Linear, Exponential, Logarithmic }
    function initiateProvider(uint256, string, bytes32, bytes32[]) public returns (bool);
    function initiateProviderCurve(bytes32, CurveType, uint128, uint128) public;
    function setEndpointParams(bytes32, bytes32[]) public;
    function getProviderPublicKey(address) public view returns (uint256);
    function getProviderTitle(address) public view returns (string);
	function getNextRouteKey(address, bytes32, uint256) public view returns (uint256, bytes32);
    function getProviderCurve(address, bytes32) public view returns (CurveType, uint128, uint128);
    function getNextProvider(uint256) public view returns (uint256, address, uint256, string);
}
