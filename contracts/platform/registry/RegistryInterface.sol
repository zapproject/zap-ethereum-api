pragma solidity ^0.5.0;

contract RegistryInterface {
    function initiateProvider(uint256, bytes32) public returns (bool);
    function initiateProviderCurve(bytes32, int256[] memory, address) public returns (bool);
    function setEndpointParams(bytes32, bytes32[] memory) public;
    function getEndpointParams(address, bytes32) public view returns (bytes32[] memory);
    function getProviderPublicKey(address) public view returns (uint256);
    function getProviderTitle(address) public view returns (bytes32);
    function setProviderParameter(bytes32, bytes memory) public;
    function setProviderTitle(bytes32) public;
    function clearEndpoint(bytes32) public;
    function getProviderParameter(address, bytes32) public view returns (bytes memory);
    function getAllProviderParams(address) public view returns (bytes32[] memory);
    function getProviderCurveLength(address, bytes32) public view returns (uint256);
    function getProviderCurve(address, bytes32) public view returns (int[] memory);
    function isProviderInitiated(address) public view returns (bool);
    function getAllOracles() external view returns (address[] memory);
    function getProviderEndpoints(address) public view returns (bytes32[] memory);
    function getEndpointBroker(address, bytes32) public view returns (address);
}
