pragma solidity ^0.4.17;
// v1.0

/* ******************************************************************
/* MAKE SURE TO transferOwnership TO Dispatch Contract UPON DEPLOYMENT
/* ******************************************************************/

import "../aux/Ownable.sol";

contract DispatchStorage is Ownable {
    
    enum Status { Pending, Fulfilled }

    //query data structure
    struct Query {
        address provider;       // data provider's address
        address subscriber;     // requester's address
        bytes32 endpoint;       // endpoint for response. (currently only 'smart_contract' endpoint supported)
        Status status;          // status of the request
    }

    //mapping of unique ids to query objects
    mapping (uint256 => Query) private queries;

    //

    /**** Get Methods ****/
    function getProvider(uint256 id) external view returns (address) {
        return queries[id].provider;
    }

    function getSubscriber(uint256 id) external view returns (address) {
        return queries[id].subscriber;
    }

    function getEndpoint(uint256 id) external view returns (bytes32) {
        return queries[id].endpoint;
    }

    function getStatus(uint256 id) external view returns (Status) {
        return queries[id].status;
    }

	/**** Set Methods ****/

    function createQuery(
        uint256 id,
        address provider,
        address subscriber,
        bytes32 endpoint
    ) 
        external
        onlyOwner
    {
        queries[id] = Query(provider, subscriber, endpoint, Status.Pending);
    }

    function setFulfilled(uint256 id) external onlyOwner {
        queries[id].status = Status.Fulfilled;
    }
}