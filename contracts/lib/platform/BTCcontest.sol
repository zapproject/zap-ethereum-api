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
    uint256 _settlePrice
  ){
    oracle = msg.sender;
    contest = SampleContest(_contest);
    settlePrice = _settlePrice;
  }

  function queryToSettle(address _coincap,string _endpoint){
    require(msg.sender == oracle, "Only Oracle owner can call query to settle");
    address dispatchAddress = coordinator.getContract("DISPATCH");
    DispatchInterface dispatch = DispatchInterface(dispatchAddress);
    query_id = dispatch.query(_coincap,"BTC",_endpoint,[18]);
    return query_id;
  }



  function callback(uint256 _id, int[] responses) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(_id == query_id,"Query id is not correct");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(contest.status==2,"Contest is not ready to settle"); //2 is the ReadyToSettle enum value
    uint256 price = responses[0];
    for(uint256 i=0;i<contest.curves_list.length;i++){
      if(contest.curves_list[i]=="BTC_UP" && price > settlePrice){
        return contest.settle(contest.curves_list[i]);
      }
      if(contest.curves_list[i]=="BTC_DOWN" && price<settlePrice){
        return contest.settle(contest.curves_list[i]);
      }
    }
  }

}
