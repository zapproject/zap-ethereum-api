pragma solidity ^0.4.19;

// Technically an abstract contract, not interface (solidity compiler devs are working to fix this right now)

contract RegistryInterface {
	enum CurveType { None, Linear, Exponential, Logarithmic }
    function initiateProvider(uint256, string, bytes32, bytes32[]) public returns (bool);
    function initiateProviderCurve(bytes32, int256[25], int256[25], int256[25], uint256[5], uint256[5], uint256[5]) public;
    function setEndpointParams(bytes32, bytes32[]) public;
    function getProviderPublicKey(address) public view returns (uint256);
    function getProviderTitle(address) public view returns (string);
	function getNextRouteKey(address, bytes32, uint256) public view returns (uint256, bytes32);
    function getProviderCurve(address, bytes32) public view returns (int256[25], int256[25], int256[25], uint256[5], uint256[5], uint256[5]);
    function getNextProvider(uint256) public view returns (uint256, address, uint256, string);
    function getCurveUnset(address, bytes32) public view returns (bool);
}
