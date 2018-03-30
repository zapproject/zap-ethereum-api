pragma solidity ^0.4.19;
// v1.0

import "../lib/Ownable.sol";

contract ArbiterStorage is Ownable {

    // Each subscription is represented as the following
    struct Subscription {
        uint64 dots;          // Cost in dots
        uint96 blockStart;    // Block number subscription was initiated
        uint96 preBlockEnd;   // Precalculated block end
    }
    
    // providerAddress => subscriberAddress => endpoint => Subscription
    mapping(address => mapping(address => mapping(bytes32 => Subscription))) private subscriptions;

    /**** Get Methods ****/

    function getDots(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint64)
    {
        return subscriptions[providerAddress][subscriberAddress][endpoint].dots;
    }

    function getBlockStart(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return subscriptions[providerAddress][subscriberAddress][endpoint].blockStart;
    }

    function getPreBlockEnd(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return subscriptions[providerAddress][subscriberAddress][endpoint].preBlockEnd;
    }

	/**** Set Methods ****/

    function setSubscription(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint,
        uint64 dots,
        uint96 blockStart,
        uint96 preBlockEnd
    )
        external
    {
        subscriptions[providerAddress][subscriberAddress][endpoint] = Subscription(
            dots,
            blockStart,
            preBlockEnd
        );
    }

    /**** Delete Methods ****/

    function deleteSubscription(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
    {
        delete subscriptions[providerAddress][subscriberAddress][endpoint];
    }
}
