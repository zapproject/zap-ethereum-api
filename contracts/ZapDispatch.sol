pragma solidity ^0.4.17;

import "./ZapBondage.sol";


/*
expose interface to user contracts
*/
contract Client1 {
    function __zapCallback(uint256 id, string _response1) public;
}
contract Client2 {
    function __zapCallback(uint256 id, string _response1, string _response2) public;
}
contract Client3 {
    function __zapCallback(uint256 id, string _response1, string _response2, string _response3) public;
}
contract Client4 {
    function __zapCallback(uint256 id, string _response1, string _response2, string _response3, string _response4) public;
}


/*

For use in example contract, see ZapDispatchExample.sol

when user contract calls ZapDispatch.query(), 1 oracle specific dot is escrowed by ZapBondage and Incoming event is emitted

when provider's client hears an Incoming event containing provider's address and responds, the provider calls a ZapDispatch.respondX function corresponding to number of response params with response params

dots are moved from ZapBondage escrow, to data-provider's bond Holder struct, with data provider address set as self's address

__zapCallback is called in user contract

*/
contract ZapDispatch {

    //event data provider is listening for, containing all relevant request parameters
    event Incoming(
        uint256 id, 
        address provider, 
        address recipient, 
        string query, 
        bytes32 endpoint, 
        bytes32[] endpoint_params);

    enum Status { Pending, Fulfilled }

    //query data structure
    struct Query {
        address subscriber;// requester's address
        address provider;//data provider's address
        bytes32 endpoint;//endpoint for response. currently only 'smart_contract' endpoint supported
        Status status;//status of the request
    }

    //mapping of unique ids to query objects
    mapping (uint256 => Query) queries;

    address bondageAddress;
    ZapBondage bondage;

    function ZapDataProxyDispatch() view {}

    /*
        initialize bondage contract for reference
    */
    function setBondageAddress(address _bondageAddress) external {
        if(bondageAddress == 0){
            bondageAddress = _bondageAddress;
            bondage = ZapBondage(_bondageAddress);
        }
    }

    /*
        called by user contract.
        escrows dot for oracle request, emitts Incoming event for data-provider
    */
    function query(
        address oracleAddress, //data provider address
        address subscriber, //user contract address( dot-holder)
        string query, //query string
        bytes32 endpoint,// endpoint specifier ala 'smart_contract'
        bytes32[] endpoint_params//endpoint-specific params
    ) 
        external 
        returns (uint256 id) 
    {

        uint dots = bondage.getDots(endpoint, oracleAddress);

        if(dots >= 1){
            //enough dots
            bondage.escrowDots(endpoint, subscriber, oracleAddress, 1);
            id = uint256(sha3(block.number, now, query, msg.sender));
            queries[id] = Query(subscriber, oracleAddress, endpoint, Status.Pending);
            Incoming(id, oracleAddress, msg.sender, query, endpoint, endpoint_params);
        }

    }

    /*
        called upon data-provider request fulfillment
        transfers dot from ZapBondage escrow to data provider's Holder object under its own address
    */
    function fulfillQuery(uint256 id) internal returns (bool) {

        if (queries[id].status != Status.Pending)
            revert();

        bondage.transferDots(
            queries[id].endpoint,
            queries[id].subscriber,
            queries[id].provider,
            1);
        queries[id].status = Status.Fulfilled;
        return true;
    }


    /*
        parameter-count specific method called by data provider in response
    */
    function respond1(uint256 id, string _response) external returns (bool) {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client1(queries[id].subscriber).__zapCallback(id, _response);
    }

    /*
        parameter-count specific method called by data provider in response
    */
    function respond2(
        uint256 id,
        string _response1,
        string _response2
    )
        external
        returns (bool) 
    {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client2(queries[id].subscriber).__zapCallback(id, _response1, _response2);
    }

    /*
        parameter-count specific method called by data provider in response
    */
    function respond3(
        uint256 id,
        string _response1,
        string _response2,
        string _response3
    )
        external
        returns (bool) 
    {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client3(queries[id].subscriber).__zapCallback(id, _response1, _response2, _response3);
    }

    /*
        parameter-count specific method called by data provider in response
    */
    function respond4(
        uint256 id, 
        string _response1,
        string _response2,
        string _response3,
        string _response4
    )
        external
        returns (bool)
    {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client4(queries[id].subscriber).__zapCallback(id, _response1, _response2, _response3, _response4);
    }
    
}
