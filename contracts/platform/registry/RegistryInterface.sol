pragma solidity ^0.4.24;
// Technically an abstract contract, not interface (solidity compiler devs are working to fix this right now)

contract RegistryInterface {
    function initiateProvider(uint256, bytes32, bytes32, bytes32[]) public returns (bool);
    function initiateProviderCurve(bytes32, int256[], uint256[], uint256[]) public returns (bool);
    function setEndpointParams(bytes32, bytes32[]) public;
    function getProviderPublicKey(address) public view returns (uint256);
    function getProviderTitle(address) public view returns (bytes32);
  	function getNextEndpointParam(address, bytes32, uint256) public view returns (uint256, bytes32);
    function getProviderCurve(address, bytes32) public view returns (int[], uint[], uint[]);
    function getNextProvider(uint256) public view returns (uint256, address, uint256, bytes32);
    // function getCurveUnset(address, bytes32) public view returns (bool);
    function getProviderArgsLength(address, bytes32) public view returns (uint,uint,uint);
}
