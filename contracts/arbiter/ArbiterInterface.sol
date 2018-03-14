pragma solidity ^0.4.17;

// Make sure to implement a setArbiterAddress fx in contracts that use this interface to support upgrades

interface ArbiterInterface {
    function initiateSubscription(address, bytes32[], bytes32, uint256, uint256) external;
    function endSubscriptionProvider(address, address, bytes32) external;
    function endSubscriptionSubscriber(address, address, bytes32) external;
}