pragma solidity ^0.4.25;
import "./SampleContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./Client.sol";


contract GitFundContest is Ownable, ClientIntArray {
  SampleContest public contest;
  ZapCoordinatorInterface public coordinator;
  address public owner;
  uint256 public query_id;
  uint256 public startPrice;
  bytes32[] public endpoints;

  constructor(
    address _cord,
    address _contest
  ){
    owner = msg.sender;
    contest = SampleContest(_contest);
    coordinator = ZapCoordinatorInterface(_cord);
    address bondageAddress = coordinator.getContract("BONDAGE");
    BondageInterface bondage = BondageInterface(bondageAddress);
    FactoryTokenInterface reserveToken = FactoryTokenInterface(coordinator.getContract("ZAP_TOKEN"));
    reserveToken.approve(address(bondageAddress),~uint256(0));

  }

  function bondToGitOracle(address _gitOracle,bytes32 _endpoint,uint256 _numDots)public returns (bool){
    address bondageAddress = coordinator.getContract("BONDAGE");
    BondageInterface bondage = BondageInterface(bondageAddress);
    FactoryTokenInterface reserveToken = FactoryTokenInterface(coordinator.getContract("ZAP_TOKEN"));
    //get reserve value to send
    bondage.bond(_gitOracle,_endpoint,_numDots);
    return true;

  }
  function queryToSettle(address _gitOracle,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == owner, "Only owner can call query to settle");
    address dispatchAddress = coordinator.getContract("DISPATCH");
    DispatchInterface dispatch = DispatchInterface(dispatchAddress);
    bytes32[] memory params = contest.getEndpoints();
    return dispatch.query(_gitOracle,"GitCommitsQuery",_endpoint,params);
  }



  function callback(uint256 _id, bytes32 _endpoint) external {
    address dispatchAddress = coordinator.getContract("DISPATCH");
    require(address(msg.sender)==address(dispatchAddress),"Only accept response from dispatch");
    require(contest.getStatus()==1,"Contest is not in initialized state"); //2 is the ReadyToSettle enum value
    return contest.judge(_endpoint);

  }

}
