pragma solidity ^0.4.24;

interface DispatchInterface {
    function query(address, string, bytes32, bytes32[]) external returns (uint256);
    function respond1(uint256, string) external returns (bool);
    function respond2(uint256, string, string) external returns (bool);
    function respond3(uint256, string, string, string) external returns (bool);
    function respond4(uint256, string, string, string, string) external returns (bool);
    function respondBytes32Array(uint256, bytes32[]) external returns (bool);
    function respondIntArray(uint256,int[] ) external returns (bool);
    function cancelQuery(uint256) external;
    function getProvider(uint256 id) public view returns (address);
    function getSubscriber(uint256 id) public view returns (address);
    function getEndpoint(uint256 id) public view returns (bytes32);
    function getStatus(uint256 id) public view returns (uint256);
    function getCancel(uint256 id) public view returns (uint256);
    function getUserQuery(uint256 id) public view returns (string);
    function getSubscriberOnchain(uint256 id) public view returns (bool);
}
