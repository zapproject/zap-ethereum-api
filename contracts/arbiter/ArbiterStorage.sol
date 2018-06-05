pragma solidity ^0.4.19;

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

    /// @dev get subscriber dots remaining for specified provider endpoint
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

    /// @dev get first subscription block number
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

    /// @dev get last subscription block number
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

    /// @dev store new subscription
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

    /// @dev remove subscription
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
