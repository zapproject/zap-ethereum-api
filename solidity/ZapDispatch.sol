import "ZapBondage.sol";

contract Client1 {
    function __zapCallback(uint256 id, string _response1);
}
contract Client2 {
    function __zapCallback(uint256 id, string _response1, string _response2);
}
contract Client3 {
    function __zapCallback(uint256 id, string _response1, string _response2, string _response3);
}
contract Client4 {
    function __zapCallback(uint256 id, string _response1, string _response2, string _response3, string _response4);
}

contract ZapDispatch {

    event Incoming(uint256 id, address provider, address recipient, string query, bytes32 endpoint, bytes32[] endpoint_params);
    enum Status { Pending, Fulfilled }
    struct Query {
        address subscriber;
        address provider;
        bytes32 endpoint;
        Status status;
    }
    mapping (uint256 => Query) queries;

    address bondageAddress;
    ZapBondage bondage;

    function ZapDataProxyDispatch() {}
    
    function setBondageAddress(address _bondageAddress){
        if(bondageAddress == 0){
            bondageAddress = _bondageAddress;
            bondage = ZapBondage(_bondageAddress);            
        }
    }
    
    function query(
        address oracleAddress, 
        address subscriber, 
        string query, 
        bytes32 endpoint, 
        bytes32[] endpoint_params) external returns (uint256 id) {
        
        uint dots = bondage._getDots(endpoint, subscriber, oracleAddress);   
        
        if(dots >= 1){
            //enough dots
            bondage.escrowDots(endpoint, subscriber, oracleAddress, 1);
            id = uint256(sha3(block.number, now, query, msg.sender));
            queries[id] = Query(subscriber, oracleAddress, endpoint, Status.Pending);
            Incoming(id, oracleAddress, msg.sender, query, endpoint, endpoint_params);            
        }

    }

    function fulfillQuery(uint256 id) internal returns (bool) {
        
        if (queries[id].status != Status.Pending)
            revert();
            
        bondage.transferDots(queries[id].endpoint, queries[id].subscriber, queries[id].provider, 1);
        queries[id].status = Status.Fulfilled;
        return true;
    }

    function respond1(uint256 id, string _response) {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client1(queries[id].subscriber).__zapCallback(id, _response);
    }

    function respond2(uint256 id, string _response1, string _response2) external returns (bool) {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client2(queries[id].subscriber).__zapCallback(id, _response1, _response2);
    }

    function respond3(uint256 id, string _response1, string _response2, string _response3) external returns (bool) {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client3(queries[id].subscriber).__zapCallback(id, _response1, _response2, _response3);
    }
    
    function respond4(uint256 id, string _response1, string _response2, string _response3, string _response4) external returns (bool) {
        if (queries[id].provider != msg.sender || !fulfillQuery(id))
            revert();
        Client4(queries[id].subscriber).__zapCallback(id, _response1, _response2, _response3, _response4);
    }
    
}
