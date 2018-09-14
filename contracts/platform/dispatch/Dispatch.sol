pragma solidity ^0.4.24;
// v1.0

import "../../lib/ownership/Upgradable.sol";
import "../../lib/lifecycle/Destructible.sol";
import "../../lib/platform/Client.sol";
import "../../lib/platform/OnChainProvider.sol";
import "../bondage/BondageInterface.sol"; 
import "./DispatchInterface.sol";
import "../database/DatabaseInterface.sol";

contract Dispatch is Destructible, DispatchInterface, Upgradable { 

    enum Status { Pending, Fulfilled, Canceled }

    //event data provider is listening for, containing all relevant request parameters
    event Incoming(
        uint256 indexed id,
        address indexed provider,
        address indexed subscriber,
        string query,
        bytes32 endpoint,
        bytes32[] endpointParams,
        bool onchainSubscriber
    );

    event FulfillQuery(
        address indexed subscriber,
        address indexed provider,
        bytes32 indexed endpoint
    );

    event OffchainResponse(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        bytes32[] response
    );

    event OffchainResponseInt(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        int[] response
    );

    event OffchainResult1(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        string response1
    );

    event OffchainResult2(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        string response1,
        string response2
    );

    event OffchainResult3(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        string response1,
        string response2,
        string response3
    );

    event OffchainResult4(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider,
        string response1,
        string response2,
        string response3,
        string response4
    );

    event CanceledRequest(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider
    );

    event RevertCancelation(
        uint256 indexed id,
        address indexed subscriber,
        address indexed provider
    );

    BondageInterface public bondage;
    address public bondageAddress;

    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        //_updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);

        bondageAddress = coordinator.getContract("BONDAGE");
        bondage = BondageInterface(bondageAddress);
    }

    /// @notice Escrow dot for oracle request
    /// @dev Called by user contract
    function query(
        address provider,           // data provider address
        string userQuery,           // query string
        bytes32 endpoint,           // endpoint specifier ala 'smart_contract'
        bytes32[] endpointParams   // endpoint-specific params
        )
        external
        returns (uint256 id)
    {
        uint256 dots = bondage.getBoundDots(msg.sender, provider, endpoint);
        bool onchainProvider = isContract(provider);
        bool onchainSubscriber = isContract(msg.sender);
        if(dots >= 1) {
            //enough dots
            bondage.escrowDots(msg.sender, provider, endpoint, 1);

            id = uint256(keccak256(abi.encodePacked(block.number, now, userQuery, msg.sender, provider)));

            createQuery(id, provider, msg.sender, endpoint, userQuery, onchainSubscriber);
            if(onchainProvider) {
                OnChainProvider(provider).receive(id, userQuery, endpoint, endpointParams, onchainSubscriber); 
            } else{
                emit Incoming(id, provider, msg.sender, userQuery, endpoint, endpointParams, onchainSubscriber);
            }
        } else { // NOT ENOUGH DOTS
            revert("Subscriber does not have any dots.");
        }
    }

    /// @notice Transfer dots from Bondage escrow to data provider's Holder object under its own address
    /// @dev Called upon data-provider request fulfillment
    function fulfillQuery(uint256 id) private returns (bool) {
        Status status = getStatus(id);

        require(status != Status.Fulfilled, "Error: Status already fulfilled");

        address subscriber = getSubscriber(id);
        address provider = getProvider(id);
        bytes32 endpoint = getEndpoint(id);
        
        if ( status == Status.Canceled ) {
            uint256 canceled = getCancel(id);

            // Make sure we've canceled in the past,
            // if it's current block ignore the cancel
            require(block.number == canceled, "Error: Cancel ignored");

            // Uncancel the query
            setCanceled(id, false);

            // Re-escrow the previously returned dots
            bondage.escrowDots(subscriber, provider, endpoint, 1);

            // Emit the events
            emit RevertCancelation(id, subscriber, provider);
        }

        setFulfilled(id);

        bondage.releaseDots(subscriber, provider, endpoint, 1);

        emit FulfillQuery(subscriber, provider, endpoint);

        return true;
    }

    /// @notice Cancel a query.
    /// @dev If responded on the same block, ignore the cancel.
    function cancelQuery(uint256 id) external {
        address subscriber = getSubscriber(id);
        address provider = getProvider(id);
        bytes32 endpoint = getEndpoint(id);

        require(subscriber == msg.sender, "Error: Wrong subscriber");
        require(getStatus(id) == Status.Pending, "Error: Query is not pending");

        // Cancel the query
        setCanceled(id, true);

        // Return the dots to the subscriber
        bondage.returnDots(subscriber, provider, endpoint, 1);

        // Release an event
        emit CanceledRequest(id, getSubscriber(id), getProvider(id));
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respondBytes32Array(
        uint256 id,
        bytes32[] response
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        if(getSubscriberOnchain(id)) {
            ClientBytes32Array(getSubscriber(id)).callback(id, response);
        }
        else {
            emit OffchainResponse(id, getSubscriber(id), msg.sender, response);
        }
        return true;
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respondIntArray(
        uint256 id,
        int[] response
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        if(getSubscriberOnchain(id)) {
            ClientIntArray(getSubscriber(id)).callback(id, response);
        }
        else {
            emit OffchainResponseInt(id, getSubscriber(id), msg.sender, response);
        }
        return true;
    }


    /// @dev Parameter-count specific method called by data provider in response
    function respond1(
        uint256 id,
        string response
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();

        if(getSubscriberOnchain(id)) {
            Client1(getSubscriber(id)).callback(id, response);
        }
        else {
            emit OffchainResult1(id, getSubscriber(id), msg.sender, response);
        }
        return true;
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond2(
        uint256 id,
        string response1,
        string response2
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();

        if(getSubscriberOnchain(id)) {
            Client2(getSubscriber(id)).callback(id, response1, response2);
        }
        else {
            emit OffchainResult2(id, getSubscriber(id), msg.sender, response1, response2);
        }

        return true;
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond3(
        uint256 id,
        string response1,
        string response2,
        string response3
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();

        if(getSubscriberOnchain(id)) {
            Client3(getSubscriber(id)).callback(id, response1, response2, response3);
        }
        else {
            emit OffchainResult3(id, getSubscriber(id), msg.sender, response1, response2, response3);
        }

        return true;
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond4(
        uint256 id,
        string response1,
        string response2,
        string response3,
        string response4
    )
        external
        returns (bool)
    {
        if (getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();

        if(getSubscriberOnchain(id)) {
            Client4(getSubscriber(id)).callback(id, response1, response2, response3, response4);
        }
        else {
            emit OffchainResult4(id, getSubscriber(id), msg.sender, response1, response2, response3, response4);
        }

        return true;
    }

    /*** STORAGE METHODS ***/

    /// @dev get provider address of request
    /// @param id request id
    function getProvider(uint256 id) public view returns (address) {
        return address(db.getNumber(keccak256(abi.encodePacked('queries', id, 'provider'))));
    }

    /// @dev get subscriber address of request
    /// @param id request id
    function getSubscriber(uint256 id) public view returns (address) {
        return address(db.getNumber(keccak256(abi.encodePacked('queries', id, 'subscriber'))));
    }

    /// @dev get endpoint of request
    /// @param id request id
    function getEndpoint(uint256 id) public view returns (bytes32) {
        return db.getBytes32(keccak256(abi.encodePacked('queries', id, 'endpoint')));
    }

    /// @dev get status of request
    /// @param id request id
    function getStatus(uint256 id) public view returns (Status) {
        return Status(db.getNumber(keccak256(abi.encodePacked('queries', id, 'status'))));
    }

    /// @dev get the cancelation block of a request
    /// @param id request id
    function getCancel(uint256 id) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('queries', id, 'cancelBlock')));
    }

    /// @dev get user specified query of request
    /// @param id request id
    function getUserQuery(uint256 id) public view returns (string) {
        return db.getString(keccak256(abi.encodePacked('queries', id, 'userQuery')));
    }

    /// @dev is subscriber contract or offchain 
    /// @param id request id
    function getSubscriberOnchain(uint256 id) public view returns (bool) {
        uint res = db.getNumber(keccak256(abi.encodePacked('queries', id, 'onchainSubscriber')));
        return res == 1 ? true : false;
    }
 
    /**** Set Methods ****/
    function createQuery(
        uint256 id,
        address provider,
        address subscriber,
        bytes32 endpoint,
        string userQuery,
        bool onchainSubscriber
    ) 
        private
    {
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'provider')), uint256(provider));
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'subscriber')), uint256(subscriber));
        db.setBytes32(keccak256(abi.encodePacked('queries', id, 'endpoint')), endpoint);
        db.setString(keccak256(abi.encodePacked('queries', id, 'userQuery')), userQuery);
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Pending));
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'onchainSubscriber')), onchainSubscriber ? 1 : 0);
    }

    function setFulfilled(uint256 id) private {
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Fulfilled));
    }

    function setCanceled(uint256 id, bool canceled) private {
        if ( canceled ) {
            db.setNumber(keccak256(abi.encodePacked('queries', id, 'cancelBlock')), block.number);
            db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Canceled));
        }
        else {
            db.setNumber(keccak256(abi.encodePacked('queries', id, 'cancelBlock')), 0);
            db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Pending));            
        }
    }

    function isContract(address addr) private view returns (bool) {
        uint size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}

/*
/* For use in example contract, see TestContracts.sol
/*
/* When User Contract calls ZapDispatch.query(),
/* 1 oracle specific dot is escrowed by ZapBondage and Incoming event is ted.
/*
/* When provider's client hears an Incoming event containing provider's address and responds,
/* the provider calls a ZapDispatch.respondX function corresponding to number of response params.
/*
/* Dots are moved from ZapBondage escrow to data-provider's bond Holder struct,
/* with data provider address set as self's address.
/*/ 

/*************************************** STORAGE ****************************************
* 'queries', id, 'provider' => {address} address of provider that this query was sent to
* 'queries', id, 'subscriber' => {address} address of subscriber that this query was sent by
* 'queries', id, 'endpoint' => {bytes32} endpoint that this query was sent to
* 'queries', id, 'status' => {Status} current status of this query
* 'queries', id, 'cancelBlock' => {uint256} the block number of the cancellation request (0 if none)
* 'queries', id, 'userQuery' => {uint256} the query that was sent with this queryId
* 'queries', id, 'onchainSubscriber' => {uint256} 1 -> onchainSubscriber, 0 -> offchainSubscriber
****************************************************************************************/
