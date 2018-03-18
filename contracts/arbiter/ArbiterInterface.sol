pragma solidity ^0.4.17;
// v1.0

// Make sure to implement a setArbiterAddress fx in contracts that use this interface to support upgrades

interface ArbiterInterface {
    function initiateSubscription(address, bytes32[], bytes32, uint256, uint64) public;
    function getSubscription(address, address, bytes32) public view returns (uint64, uint96, uint96);
    function endSubscriptionProvider(address, address, bytes32) public;
    function endSubscriptionSubscriber(address, address, bytes32) public;
}