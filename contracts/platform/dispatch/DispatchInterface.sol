pragma solidity ^0.5.0;

interface DispatchInterface {
    function query(address, string calldata, bytes32, bytes32[] calldata) external returns (uint256);
    function respond1(uint256, string calldata) external returns (bool);
    function respond2(uint256, string calldata, string calldata) external returns (bool);
    function respond3(uint256, string calldata, string calldata, string calldata) external returns (bool);
    function respond4(uint256, string calldata, string calldata, string calldata, string calldata) external returns (bool);
    function respondBytes32Array(uint256, bytes32[] calldata) external returns (bool);
    function respondIntArray(uint256,int[] calldata) external returns (bool);
    function cancelQuery(uint256) external;
    function getProvider(uint256 id) external view returns (address);
    function getSubscriber(uint256 id) external view returns (address);
    function getEndpoint(uint256 id) external view returns (bytes32);
    function getStatus(uint256 id) external view returns (uint256);
    function getCancel(uint256 id) external view returns (uint256);
    function getUserQuery(uint256 id) external view returns (string memory);
    function getSubscriberOnchain(uint256 id) external view returns (bool);
}
