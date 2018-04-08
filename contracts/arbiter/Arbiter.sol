pragma solidity ^0.4.19;
// v1.0

import "../lib/Mortal.sol";
import "../lib/update/Updatable.sol";
import "../lib/addressSpace/AddressSpace.sol";
import "../lib/addressSpace/AddressSpacePointer.sol";
import "./ArbiterStorage.sol";

contract Arbiter is Mortal, Updatable {
    // Called when a data purchase is initiated
    event DataPurchase(
        address indexed provider,          // Etheruem address of the provider
        address indexed subscriber,        // Ethereum address of the subscriber
        uint256 publicKey,                 // Public key of the subscriber
        uint256 indexed amount,            // Amount (in 1/100 TOK) of ethereum sent
        bytes32[] endpointParams,          // Endpoint specific(nonce,encrypted_uuid),
        bytes32 endpoint                   // Endpoint specifier
    );

    // Called when a data subscription is ended by either provider or terminator
    event DataSubscriptionEnd(
        address indexed provider,                      // Provider from the subscription
        address indexed subscriber,                    // Subscriber from the subscription
        SubscriptionTerminator indexed terminator      // Which terminated the contract
    ); 

    // Used to specify who is the terminator of a contract
    enum SubscriptionTerminator { Provider, Subscriber }
    
    ArbiterStorage stor;
    BondageInterface bondage;

    AddressSpacePointer pointer;
    AddressSpace addresses;

    address public storageAddress;

    function Arbiter(address pointerAddress, address _storageAddress) public {
        pointer = AddressSpacePointer(pointerAddress);
        storageAddress = _storageAddress;
        stor = ArbiterStorage(storageAddress);
    }

    function updateContract() external {
        if (addresses != pointer.addresses()) addresses = AddressSpace(pointer.addresses());
        bondage = addresses.instantiateBondage(bondage);
    }

    function initiateSubscription(
        address providerAddress,   // Provider address
        bytes32 endpoint,          // Endpoint specifier
        bytes32[] endpointParams,  // Endpoint specific params
        uint256 publicKey,         // Public key of the purchaser
        uint64 blocks              // Number of blocks subscribed, 1block=1dot
    ) 
        public 
    {   
        // Must be atleast one block
        require(blocks > 0);

        // Can't reinitiate a currently active contract
        require(stor.getDots(providerAddress, msg.sender, endpoint) == 0);

        // Escrow the necessary amount of dots
        bondage.escrowDots(msg.sender, providerAddress, endpoint, blocks);
        
        // Initiate the subscription struct
        stor.setSubscription(
            providerAddress,
            msg.sender,
            endpoint,
            blocks,
            uint96(block.number),
            uint96(block.number) + uint96(blocks)
        );

        DataPurchase(
            providerAddress,
            msg.sender,
            publicKey,
            blocks,
            endpointParams,
            endpoint
        );
    }

    function getSubscription(address providerAddress, address subscriberAddress, bytes32 endpoint)
        public
        view
        returns (uint64 dots, uint96 blockStart, uint96 preBlockEnd)
    {
        return (
            stor.getDots(providerAddress, subscriberAddress, endpoint),
            stor.getBlockStart(providerAddress, subscriberAddress, endpoint),
            stor.getPreBlockEnd(providerAddress, subscriberAddress, endpoint)
        );
    }

    /// @dev Finish the data feed from the provider
    function endSubscriptionProvider(        
        address subscriberAddress,
        bytes32 endpoint
    )
        public 
    {
        // Emit an event on success about who ended the contract
        if (endSubscription(msg.sender, subscriberAddress, endpoint))
             DataSubscriptionEnd(
                msg.sender, 
                subscriberAddress, 
                SubscriptionTerminator.Provider
            );
    }

    /// @dev Finish the data feed from the subscriber
    function endSubscriptionSubscriber(
        address providerAddress,
        bytes32 endpoint
    )
        public 
    {
        // Emit an event on success about who ended the contract
        if (endSubscription(providerAddress, msg.sender, endpoint))
             DataSubscriptionEnd(
                providerAddress,
                msg.sender,
                SubscriptionTerminator.Subscriber
            );
    }

    /// @dev Finish the data feed
    function endSubscription(        
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        private
        returns (bool)
    {
        uint256 dots = stor.getDots(providerAddress, subscriberAddress, endpoint);
        uint256 preblockend = stor.getPreBlockEnd(providerAddress, subscriberAddress, endpoint);
        // Make sure the subscriber has a subscription
        require(dots > 0);

        if (block.number < preblockend) {
            // Subscription ended early
            uint256 earnedDots = (block.number * dots) / preblockend;
            uint256 returnedDots = dots - earnedDots;

            // Transfer the earned dots to the provider
            bondage.releaseDots(
                subscriberAddress,
                providerAddress,
                endpoint,
                earnedDots
            );
            //  Transfer the returned dots to the subscriber
            bondage.releaseDots(
                subscriberAddress,
                subscriberAddress,
                endpoint,
                returnedDots
            );
        } else {
            // Transfer all the dots
            bondage.releaseDots(
                subscriberAddress,
                providerAddress,
                endpoint,
                dots
            );
        }
        // Kill the subscription
        stor.deleteSubscription(providerAddress, subscriberAddress, endpoint);
        return true;
    }    
}
