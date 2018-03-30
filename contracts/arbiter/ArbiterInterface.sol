pragma solidity ^0.4.19;

interface ArbiterInterface {
    function initiateSubscription(address, bytes32[], bytes32, uint256, uint64) external;
    function getSubscription(address, address, bytes32) external view returns (uint64, uint96, uint96);
    function endSubscriptionProvider(address, address, bytes32) external;
    function endSubscriptionSubscriber(address, address, bytes32) external;
}
