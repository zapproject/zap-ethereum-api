import "./SampleContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "./Client.sol";


/// @title BTCcontest
/// @notice
/// @dev
contract BTCcontest is Ownable, ClientIntArray {
  /// @notice
  SampleContest public contest;
  /// @notice
  ZapCoordinatorInterface public coordinator;
  /// @notice
  address public oracle;
  /// @notice
  address public contest;
  /// @notice
  uint256 public query_id;
  /// @notice
  uint256 public settlePrice;
  /// @notice
  bytes32 public upEndpoint;
  /// @notice
  bytes32 public downEndpoint;

  /// @notice
  /// @dev
  /// @param _contest
  /// @param _settlePrice
  /// @param _upEndpoint
  /// @param _downEndpoint
  /// @return
  constructor(
    address _contest,
    uint256 _settlePrice,
    bytes32 _upEndpoint,
    bytes32 _downEndpoint
  ){
    oracle = msg.sender;
    contest = SampleContest(_contest);
    settlePrice = _settlePrice;
    require(contest.isEndpointValid(_upEndpoint) && contest.isEndpointValid(_downEndpoint),"Endpoints are not valid");
    upEndpoint = _upEndpoint;
    downEndpoint = _downEndpoint;
  }

  /// @notice
  /// @dev
  /// @param _coincap
  /// @param _endpoint
  /// @return
  function queryToSettle(address _coincap,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == oracle, "Only Oracle owner can call query to settle");
    address dispatchAddress = coordinator.getContract("DISPATCH");
    DispatchInterface dispatch = DispatchInterface(dispatchAddress);
    bytes32[] memory params = bytes32[];
    query_id = dispatch.query(_coincap,"BTC",_endpoint,params);
    return query_id;
  }



  /// @notice
  /// @dev
  /// @param _id
  /// @param responses
  /// @return
  function callback(uint256 _id, int[] responses) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(_id == query_id,"Query id is not correct");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(contest.getStatus()==2,"Contest is not ready to settle"); //2 is the ReadyToSettle enum value
    uint256 price = uint256(responses[0]);
    bytes32[] endpoints = contest.getEndpoints();
    for(uint256 i=0;i<endpoints.length;i++){
      if(endpoints[i]==upEndpoint && price > settlePrice){
        return contest.settle(endpoints[i]);
      }
      if(endpoints[i]==downEndpoint && price<settlePrice){
        return contest.settle(endpoints[i]);
      }
    }
  }

}
