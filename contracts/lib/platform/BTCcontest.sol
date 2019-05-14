pragma solidity ^0.4.25;
import "./SampleContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./Client.sol";


contract BTCcontest is Ownable, ClientIntArray {
  SampleContest public contest;
  ZapCoordinatorInterface public coordinator;
  address public oracle;
  uint256 public query_id;
  uint256 public startPrice;
  bytes32 public upEndpoint;
  bytes32 public downEndpoint;

  constructor(
    address _cord,
    address _contest,
    uint256 _startPrice,
    bytes32 _upEndpoint,
    bytes32 _downEndpoint
  ){
    oracle = msg.sender;
    contest = SampleContest(_contest);
    startPrice = _startPrice;
    coordinator = ZapCoordinatorInterface(_cord);
    require(contest.isEndpointValid(_upEndpoint) && contest.isEndpointValid(_downEndpoint),"Endpoints are not valid");
    upEndpoint = _upEndpoint;
    downEndpoint = _downEndpoint;
    address bondageAddress = coordinator.getContract("BONDAGE");
    BondageInterface bondage = BondageInterface(bondageAddress);
    FactoryTokenInterface reserveToken = FactoryTokenInterface(coordinator.getContract("ZAP_TOKEN"));
    //get reserve value to send
    reserveToken.approve(address(bondageAddress),~uint256(0));

  }

  function bondToCoincap(address _coincap,bytes32 _endpoint,uint256 _numDots)public returns (bool){
    address bondageAddress = coordinator.getContract("BONDAGE");
    BondageInterface bondage = BondageInterface(bondageAddress);
    FactoryTokenInterface reserveToken = FactoryTokenInterface(coordinator.getContract("ZAP_TOKEN"));
    //get reserve value to send
    bondage.bond(_coincap,_endpoint,_numDots);
    return true;

  }
  function queryToSettle(address _coincap,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == oracle, "Only Oracle owner can call query to settle");
    address dispatchAddress = coordinator.getContract("DISPATCH");
    DispatchInterface dispatch = DispatchInterface(dispatchAddress);
    bytes32[] memory params = new bytes32[](0);
    return dispatch.query(_coincap,"BTC",_endpoint,params);
  }



  function callback(uint256 _id, int[] responses) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(contest.getStatus()==1,"Contest is not in initialized state"); //2 is the ReadyToSettle enum value
    uint256 price = uint256(responses[0]);
    bytes32[] memory endpoints = contest.getEndpoints();
    for(uint256 i=0;i<endpoints.length;i++){
      if(endpoints[i]==upEndpoint && price > startPrice){
        return contest.judge(endpoints[i]);
      }
      if(endpoints[i]==downEndpoint && price<startPrice){
        return contest.judge(endpoints[i]);
      }
    }
  }

}
