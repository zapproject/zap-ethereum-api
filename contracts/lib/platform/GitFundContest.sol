pragma solidity ^0.4.25;
import "./FundingContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./Client.sol";


contract GitFundContest is Ownable, ClientBytes32Array {
  FundingContest public contest;
  ZapCoordinatorInterface public coordinator;
  BondageInterface bondage;
  DispatchInterface dispatch;
  address public owner;
  uint256 public query_id;
  uint256 public startPrice;
  bytes32[] public endpoints;
  uint256 queryId;

  constructor(
    address _cord,
    address _contest
  ){
    owner = msg.sender;
    contest = FundingContest(_contest);
    coordinator = ZapCoordinatorInterface(_cord);
    address bondageAddress = coordinator.getContract("BONDAGE");
    bondage = BondageInterface(bondageAddress);
    address dispatchAddress = coordinator.getContract("DISPATCH");
    dispatch = DispatchInterface(dispatchAddress);
    FactoryTokenInterface reserveToken = FactoryTokenInterface(coordinator.getContract("ZAP_TOKEN"));
    reserveToken.approve(address(bondageAddress),~uint256(0));

  }

  function bondToGitOracle(address _gitOracle,bytes32 _endpoint,uint256 _numDots)public returns (bool){
    bondage.bond(_gitOracle,_endpoint,_numDots);
    return true;

  }
  function queryToSettle(address _gitOracle,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == owner, "Only owner can call query to settle");
    bytes32[] memory params = contest.getEndpoints();
    queryId = dispatch.query(_gitOracle,"GitCommitsQuery",_endpoint,params);
    return queryId;
  }

  function callback(uint256 _id, bytes32[] _endpoints) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(_id == queryId, "wrong query ID");
    require(contest.getStatus()==1,"Contest is not in initialized state"); //2 is the ReadyToSettle enum value
    return contest.judge(_endpoints[0]);

  }

}
