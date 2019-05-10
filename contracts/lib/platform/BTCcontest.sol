import "./SampleContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "./Client.sol";


contract BTCcontest is Ownable, ClientIntArray {
  SampleContest public contest;
  ZapCoordinatorInterface public coordinator;
  address public oracle;
  address public contest;
  uint256 public query_id;
  uint256 settlePrice;

  constructor(
    address _contest,
    uint256 _settlePrice,
    bytes32 _upEndpoint,
    bytes32 _downEndpoint
  ){
    oracle = msg.sender;
    contest = SampleContest(_contest);
    settlePrice = _settlePrice;
    require(contest.isEndpointValid(_upEndpoint) && contest.isEndpointValid(_downEndpoint),"Endpoints are not valid")
    upEndpoint = _upEndpoint;
    downEndpoint = _downEndpoint;
  }

  function queryToSettle(address _coincap,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == oracle, "Only Oracle owner can call query to settle");
    address dispatchAddress = coordinator.getContract("DISPATCH");
    DispatchInterface dispatch = DispatchInterface(dispatchAddress);
    query_id = dispatch.query(_coincap,"BTC",_endpoint);
    return query_id;
  }



  function callback(uint256 _id, int[] responses) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(_id == query_id,"Query id is not correct");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(contest.getStatus()==2,"Contest is not ready to settle"); //2 is the ReadyToSettle enum value
    uint256 price = uint256(responses[0]);
    bytes32[] endpoints = contest.getEndpoints();
    for(uint256 i=0;i<endpoints.length;i++){
      if(endpoints[i]==up_endpoint && price > settlePrice){
        return contest.settle(endpoints[i]);
      }
      if(endpoints[i]==down_endpoint && price<settlePrice){
        return contest.settle(endpoints[i]);
      }
    }
  }

}
