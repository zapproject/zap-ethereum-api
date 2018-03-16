pragma solidity ^0.4.17;
// v1.0

import "../aux/Mortal.sol";
import "../bondage/BondageInterface.sol";
import "./ArbiterStorage.sol";

contract Arbiter is Mortal {
    // Called when a data purchase is initiated
    event LogDataPurchase(
        address provider,          // Etheruem address of the provider
        address subscriber,        // Ethereum address of the subscriber
        uint256 public_key,        // Public key of the subscriber
        uint256 amount,            // Amount (in 1/100 TOK) of ethereum sent
        bytes32[] endpoint_params, // Endpoint specific(nonce,encrypted_uuid),
        bytes32 endpoint
    );

    // Used to specify who is the terminator of a contract
    enum SubscriptionTerminator { Provider, Subscriber }

    // Called when a data subscription is ended by either provider or terminator
    event LogDataSubscriptionEnd(
        address provider,                      // Provider from the subscription
        address subscriber,                    // Subscriber from the subscription
        SubscriptionTerminator terminator      // Which terminated the contract
    ); 
    
    ArbiterStorage stor;
    BondageInterface bondage;

    function Arbiter(address storageAddress, address bondageAddress) public {
        stor = ArbiterStorage(storageAddress);
        setBondageAddress(bondageAddress);
    }

    /// @notice Reinitialize bondage instance after upgrade
    function setBondageAddress(address bondageAddress) public onlyOwner {
        bondage = BondageInterface(bondageAddress);
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
        require(stor.getDots(provider_address, msg.sender, endpoint) == 0);

        // Escrow the necessary amount of dots
        bondage.escrowDots(msg.sender, provider_address, endpoint, blocks);
        
        // Initiate the subscription struct
        stor.setSubscription(
            provider_address,
            msg.sender,
            endpoint,
            blocks,
            block.number,
            block.number + blocks
        );

        // Emit the event
        LogDataPurchase(
            provider_address,
            msg.sender,
            public_key,
            blocks,
            endpoint_params,
            endpoint
        );
    }

    /// @dev Finish the data feed
    function endSubscription(        
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        public
        returns (bool)
    {
        uint256 dots = stor.getDots(provider_address, subscriber_address, endpoint);
        uint256 preblockend = stor.getPreblockend(provider_address, subscriber_address, endpoint);
        // Make sure the subscriber has a subscription
        require(dots > 0);

        if (block.number < preblockend) {
            // Subscription ended early
            uint256 earnedDots = (block.number * dots) / preblockend;
            uint256 returnedDots = dots - earnedDots;

            // Transfer the earned dots to the provider
            bondage.releaseDots(
                subscriber_address,
                provider_address,
                endpoint,
                earnedDots
            );
            //  Transfer the returned dots to the subscriber
            bondage.releaseDots(
                subscriber_address,
                subscriber_address,
                endpoint,
                returnedDots
            );
        } else {
            // Transfer all the dots
            bondage.releaseDots(
                subscriber_address,
                provider_address,
                endpoint,
                dots
            );
        }
        // Kill the subscription
        stor.setDots(provider_address, subscriber_address, endpoint, 0);
        return true;
    }

    /// @dev Finish the data feed from the provider
    function endSubscriptionProvider(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        public 
    {
        // Emit an event on success about who ended the contract
        if (endSubscription(provider_address, subscriber_address, endpoint))
            LogDataSubscriptionEnd(
                msg.sender, 
                subscriber_address, 
                SubscriptionTerminator.Provider
            );
    }

    /// @dev Finish the data feed from the subscriber
    function endSubscriptionSubscriber(
        address provider_address,
        address subscriber_address,
        bytes32 endpoint
    )
        public 
    {
        // Emit an event on success about who ended the contract
        if (endSubscription(provider_address, subscriber_address, endpoint))
            LogDataSubscriptionEnd(
                provider_address,
                msg.sender,
                SubscriptionTerminator.Subscriber
            );
    }    
}
