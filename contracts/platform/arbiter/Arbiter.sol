pragma solidity ^0.4.24;
// v1.0

import "../../lib/ownership/Upgradable.sol";
import "../../lib/lifecycle/Destructible.sol";
import "../bondage/BondageInterface.sol";
import "./ArbiterInterface.sol";
import "../database/DatabaseInterface.sol";


contract Arbiter is Destructible, ArbiterInterface, Upgradable {
    // Called when a data purchase is initiated
    event DataPurchase(
        address indexed provider,          // Etheruem address of the provider
        address indexed subscriber,        // Ethereum address of the subscriber
        uint256 publicKey,                 // Public key of the subscriber
        uint256 indexed amount,            // Amount (in 1/100 ZAP) of ethereum sent
        bytes32[] endpointParams,          // Endpoint specific(nonce,encrypted_uuid),
        bytes32 endpoint                   // Endpoint specifier
    );

    // Called when a data subscription is ended by either provider or terminator
    event DataSubscriptionEnd(
        address indexed provider,                      // Provider from the subscription
        address indexed subscriber,                    // Subscriber from the subscription
        SubscriptionTerminator indexed terminator      // Which terminated the contract
    );

    // Called when party passes arguments to another party
    event ParamsPassed(
        address indexed sender,
        address indexed receiver,
        bytes32 endpoint,
        bytes32[] params
    );

    // Used to specify who is the terminator of a contract
    enum SubscriptionTerminator { Provider, Subscriber }

    BondageInterface bondage;
    address public bondageAddress;

    // database address and reference
    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        bondageAddress = coordinator.getContract("BONDAGE");
        bondage = BondageInterface(bondageAddress);

        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
    }

    //@dev broadcast parameters from sender to offchain receiver
    /// @param receiver address
    /// @param endpoint Endpoint specifier
    /// @param params arbitrary params to be passed
    function passParams(address receiver, bytes32 endpoint, bytes32[] params) public {
        emit ParamsPassed(msg.sender, receiver, endpoint, params);
    }

    /// @dev subscribe to specified number of blocks of provider
    /// @param providerAddress Provider address
    /// @param endpoint Endpoint specifier
    /// @param endpointParams Endpoint specific params
    /// @param publicKey Public key of the purchaser
    /// @param blocks Number of blocks subscribed, 1block=1dot
    function initiateSubscription(
        address providerAddress,   //
        bytes32 endpoint,          //
        bytes32[] endpointParams,  //
        uint256 publicKey,         // Public key of the purchaser
        uint64 blocks              //
    )
        public
    {
        // Must be atleast one block
        require(blocks > 0, "Error: Must be at least one block");

        // Can't reinitiate a currently active contract
        require(getDots(providerAddress, msg.sender, endpoint) == 0, "Error: Cannot reinstantiate a currently active contract");

        // Escrow the necessary amount of dots
        bondage.escrowDots(msg.sender, providerAddress, endpoint, blocks);

        // Initiate the subscription struct
        setSubscription(
            providerAddress,
            msg.sender,
            endpoint,
            blocks,
            uint96(block.number),
            uint96(block.number) + uint96(blocks)
        );

        emit DataPurchase(
            providerAddress,
            msg.sender,
            publicKey,
            blocks,
            endpointParams,
            endpoint
        );
    }

    /// @dev get subscription info
    function getSubscription(address providerAddress, address subscriberAddress, bytes32 endpoint)
        public
        view
        returns (uint64 dots, uint96 blockStart, uint96 preBlockEnd)
    {
        return (
            getDots(providerAddress, subscriberAddress, endpoint),
            getBlockStart(providerAddress, subscriberAddress, endpoint),
            getPreBlockEnd(providerAddress, subscriberAddress, endpoint)
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
            emit DataSubscriptionEnd(
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
            emit DataSubscriptionEnd(
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
        // get the total value/block length of this subscription
        uint256 dots = getDots(providerAddress, subscriberAddress, endpoint);
        uint256 preblockend = getPreBlockEnd(providerAddress, subscriberAddress, endpoint);
        // Make sure the subscriber has a subscription
        require(dots > 0, "Error: Subscriber must have a subscription");

        if (block.number < preblockend) {
            // Subscription ended early
            uint256 earnedDots = block.number - getBlockStart(providerAddress, subscriberAddress, endpoint);
            uint256 returnedDots = dots - earnedDots;

            // Transfer the earned dots to the provider
            bondage.releaseDots(
                subscriberAddress,
                providerAddress,
                endpoint,
                earnedDots
            );
            //  Transfer the returned dots to the subscriber
            bondage.returnDots(
                subscriberAddress,
                providerAddress,
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
        deleteSubscription(providerAddress, subscriberAddress, endpoint);
        return true;
    }


    /*** --- *** STORAGE METHODS *** --- ***/

    /// @dev get subscriber dots remaining for specified provider endpoint
    function getDots(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        public
        view
        returns (uint64)
    {
        return uint64(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots'))));
    }

    /// @dev get first subscription block number
    function getBlockStart(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        public
        view
        returns (uint96)
    {
        return uint96(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart'))));
    }

    /// @dev get last subscription block number
    function getPreBlockEnd(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        public
        view
        returns (uint96)
    {
        return uint96(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd'))));
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
        private
    {
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots')), dots);
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart')), uint256(blockStart));
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd')), uint256(preBlockEnd));
    }

    /**** Delete Methods ****/

    /// @dev remove subscription
    function deleteSubscription(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        private
    {
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots')), 0);
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart')), uint256(0));
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd')), uint256(0));
    }
}

    /*************************************** STORAGE ****************************************
    * 'holders', holderAddress, 'initialized', oracleAddress => {uint256} 1 -> provider-subscriber initialized, 0 -> not initialized
    * 'holders', holderAddress, 'bonds', oracleAddress, endpoint => {uint256} number of dots this address has bound to this endpoint
    * 'oracles', oracleAddress, endpoint, 'broker' => {address} address of endpoint broker, 0 if none
    * 'escrow', holderAddress, oracleAddress, endpoint => {uint256} amount of Zap that have been escrowed
    * 'totalBound', oracleAddress, endpoint => {uint256} amount of Zap bound to this endpoint
    * 'totalIssued', oracleAddress, endpoint => {uint256} number of dots issued by this endpoint
    * 'holders', holderAddress, 'oracleList' => {address[]} array of oracle addresses associated with this holder
    ****************************************************************************************/
