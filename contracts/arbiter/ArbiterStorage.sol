pragma solidity ^0.4.17;
// v1.0

/* ******************************************************************
/* MAKE SURE TO transferOwnership TO Arbiter Contract UPON DEPLOYMENT
/* ******************************************************************/ 

import "../aux/Ownable.sol";

contract ArbiterStorage is Ownable {

    // Each subscription is represented as the following
    struct Subscription {
        uint256 dots;          // Cost in dots
        uint256 blockstart;    // Block number subscription was initiated
        uint256 preblockend;   // Precalculated block end
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
        returns (uint256)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].dots;
    }

    function getBlockstart(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        external
        view
        returns (uint256)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].blockstart;
    }

    function getPreblockend(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        external
        view
        returns (uint256)
    {
        return subscriptions[provider_address][subscriber_address][endpoint].preblockend;
    }

	/**** Set Methods ****/
    
    function setDots(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint,
        uint256 value
    )
        external
    {
        subscriptions[provider_address][subscriber_address][endpoint].dots = value;
    }

    function setSubscription(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint,
        uint256 dots,
        uint256 blockstart,
        uint256 preblockend
    )
        external
    {
        subscriptions[provider_address][subscriber_address][endpoint] = Subscription(
            dots,
            blockstart,
            preblockend
        );
    }
}