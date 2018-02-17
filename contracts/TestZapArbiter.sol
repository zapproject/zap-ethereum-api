pragma solidity ^0.4.17;

import "./ZapRegistry.sol";
import "./ZapBondage.sol";

contract TestZapArbiter {

    // Called when a data purchase is initiated
    event ZapDataPurchase(
        address provider_address,  // Etheruem address of the provider
        address subscriber,        // Ethereum address of the subscriber
        uint256 public_key,        // Public key of the subscriber
        uint256 amount,            // Amount (in 1/100 zap) of ethereum sent
        bytes32[] endpoint_params, // Endpoint specific(nonce,encrypted_uuid),
        bytes32 endpoint);

    // Used to specify who is the terminator of a contract
    enum ZapSubscriptionTerminator { ZapTermProvider, ZapTermSubscriber }

    // Called when a data subscription is ended by either provider or terminator
    event ZapDataSubscriptionEnd(
        address provider,                      // Provider from the subscription
        address subsriber,                     // Subscriber from the subscription
        ZapSubscriptionTerminator terminator); // Which terminated the contract

    // Each subscription is represented as the following
    struct ZapSubscription {
        uint dots;          // Cost in dots
        uint blockstart;    // Block number subscription was initiated
        uint preblockend;   // Precalculated block end
    }

    uint public decimals = 10**16; // 1/100th of zap

    ZapBondage public bondage;
    ZapRegistry public registry;

    //provider_address => subscriber_address => endpoint => ZapSubscription
    mapping(address => mapping(address => mapping(bytes32 => ZapSubscription))) public subscriptions;

    function TestZapArbiter(
        address _bondageAddress,
        address _registryAddress
    )
        public
    {
        registry = ZapRegistry(_registryAddress);
        bondage = ZapBondage(_bondageAddress);
    }

    function initiateSubscription(
        address provider_address,  // Provider address
        bytes32[] endpoint_params, // Endpoint specific params
        bytes32 endpoint,          // Endpoint specifier
        uint256 public_key,        // Public key of the purchaser
        uint256 blocks             // Number of blocks subscribed, 1block=1dot
    )
        public
    {
        // Must be atleast one block
        require(blocks > 0);

        // Can't reinitiate a currently active contract
        require(subscriptions[provider_address][msg.sender][endpoint].dots == 0);

        // Escrow the necessary amount of dots
        bondage.escrowDots(endpoint, msg.sender, provider_address, blocks);

        // Initiate the subscription struct
        subscriptions[provider_address][msg.sender][endpoint] = ZapSubscription({
            dots: blocks,
            blockstart: block.number,
            preblockend: block.number + blocks});

        // Emit the event
        ZapDataPurchase(
            provider_address,
            msg.sender,
            public_key,
            blocks,
            endpoint_params,
            endpoint);
    }

    /// @dev Finish the data feed
    function endZapSubscription(
        bytes32 endpoint,
        address provider_address,
        address subscriber_address
    )
        public
        returns (bool)
    {
        ZapSubscription storage subscription = subscriptions[provider_address][subscriber_address][endpoint];

        // Make sure the subscriber has a subscription
        require(subscription.dots > 0);

        if (block.number < subscription.preblockend) {
            // Subscription ended early
            uint256 earnedDots = (block.number * subscription.dots) / subscription.preblockend;
            uint256 returnedDots = subscription.dots - earnedDots;

            // Transfer the earned dots to the provider
            bondage.releaseDots(
                endpoint,
                subscriber_address,
                provider_address,
                earnedDots);
            //  Transfer the returned dots to the subscriber
            bondage.releaseDots(
                endpoint,
                subscriber_address,
                subscriber_address,
                returnedDots);
        } else {
            // Transfer all the dots
            bondage.releaseDots(
                endpoint,
                subscriber_address,
                provider_address,
                subscription.dots);
        }
        // Kill the subscription
        subscription.dots = 0;

        return true;
    }

    /// @dev Finish the data feed from the provider
    function endZapSubscription_Provider(
        bytes32 endpoint,
        address subscriber_address,
        address provider_address
    )
        public
    {
        // Emit an event on success about who ended the contract
        if (endZapSubscription(endpoint, provider_address, subscriber_address))
            ZapDataSubscriptionEnd(
                msg.sender,
                subscriber_address,
                ZapSubscriptionTerminator.ZapTermProvider);
    }

    /// @dev Finish the data feed from the provider
    function endZapSubscription_Subscriber(
        bytes32 endpoint,
        address subscriber_address,
        address provider_address
    )
        public
    {
        // Emit an event on success about who ended the contract
        if (endZapSubscription(endpoint, provider_address, subscriber_address))
            ZapDataSubscriptionEnd(
                provider_address,
                msg.sender,
                ZapSubscriptionTerminator.ZapTermProvider);
    }
}
