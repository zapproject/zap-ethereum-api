pragma solidity ^0.4.17;
// v1.0

// Make sure to implement a setDispatchAddress fx in contracts that use this interface to support upgrades

interface DispatchInterface {
    function query(address, address,  string, bytes32, bytes32[]) external returns (uint256);
    function respond1(uint256, string) external returns (bool);
    function respond2(uint256, string, string) external returns (bool);
    function respond3(uint256, string, string, string) external returns (bool);
    function respond4(uint256, string, string, string, string) external returns (bool);
}