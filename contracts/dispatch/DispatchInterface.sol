pragma solidity ^0.4.24;

interface DispatchInterface {
    function query(address, string, bytes32, bytes32[], bool onchain) external returns (uint256);
    function respond1(uint256, string) external returns (bool);
    function respond2(uint256, string, string) external returns (bool);
    function respond3(uint256, string, string, string) external returns (bool);
    function respond4(uint256, string, string, string, string) external returns (bool);
}
