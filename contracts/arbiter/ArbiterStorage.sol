pragma solidity ^0.4.17;
// v1.0

/* ******************************************************************
/* MAKE SURE TO transferOwnership TO Arbiter Contract UPON DEPLOYMENT
/* ******************************************************************/ 

import "../aux/Ownable.sol";

contract ArbiterStorage is Ownable {

    // Each subscription is represented as the following
    struct Subscription {
        uint64 dots;          // Cost in dots
        uint96 blockStart;    // Block number subscription was initiated
        uint96 preBlockEnd;   // Precalculated block end
    }
    
    // provider_address => subscriber_address => endpoint => Subscription
    mapping(address => mapping(address => mapping(bytes32 => Subscription))) private subscriptions;

    /**** Get Methods ****/

    function getDots(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        external
        view
        returns (uint64)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].dots;
    }

    function getBlockStart(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].blockStart;
    }

    function getPreBlockEnd(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].preBlockEnd;
    }

	/**** Set Methods ****/
    
    function setDots(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint,
        uint64 value
    )
        external
    {
        subscriptions[provider_address][subscriber_address][endpoint].dots = value;
    }

    function setSubscription(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint,
        uint64 dots,
        uint96 blockStart,
        uint96 preBlockEnd
    )
        external
    {
        subscriptions[provider_address][subscriber_address][endpoint] = Subscription(
            dots,
            blockStart,
            preBlockEnd
        );
    }
}