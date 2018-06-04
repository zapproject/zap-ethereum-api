pragma solidity ^0.4.19;

import "../lib/Ownable.sol";

contract DispatchStorage is Ownable {
    
    enum Status { Pending, Fulfilled }

    //query data structure
    struct Query {
        address provider;       // data provider's address
        address subscriber;     // requester's address
        bytes32 endpoint;       // endpoint for response. (currently only 'smart_contract' endpoint supported)
        Status status;          // status of the request
        string userQuery;
    }

    //mapping of unique ids to query objects
    mapping(uint256 => Query) private queries;

    /**** Get Methods ****/

    /// @dev get provider address of request
    /// @param id request id
    function getProvider(uint256 id) external view returns (address) {
        return queries[id].provider;
    }

    /// @dev get subscriber address of request
    /// @param id request id
    function getSubscriber(uint256 id) external view returns (address) {
        return queries[id].subscriber;
    }

    /// @dev get endpoint of request
    /// @param id request id
    function getEndpoint(uint256 id) external view returns (bytes32) {
        return queries[id].endpoint;
    }

    /// @dev get status of request
    /// @param id request id
    function getStatus(uint256 id) external view returns (Status) {
        return queries[id].status;
    }

    /// @dev get user specified query of request
    /// @param id request id
    function getUserQuery(uint256 id) external view returns (string) {
        return queries[id].userQuery;
    }



	/**** Set Methods ****/
    function createQuery(
        uint256 id,
        address provider,
        address subscriber,
        bytes32 endpoint,
        string userQuery
    ) 
        external
        onlyOwner
    {
        queries[id] = Query(provider, subscriber, endpoint, Status.Pending, userQuery);
    }

    function setFulfilled(uint256 id) external onlyOwner {
        queries[id].status = Status.Fulfilled;
    }
}
