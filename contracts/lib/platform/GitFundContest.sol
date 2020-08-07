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
	uint256 start_time;

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
		start_time = now;
  }

  function bondToGitOracle(address _gitOracle,bytes32 _endpoint,uint256 _numDots)public returns (bool){
    bondage.bond(_gitOracle,_endpoint,_numDots);
    return true;

  }
  function queryToSettle(address _gitOracle,bytes32 _endpoint) public returns(uint256){
    require(msg.sender == owner, "Only owner can call query to settle");
		bytes32[] memory params = new bytes32[]( contest.getEndpoints().length + 1);
		params[0] = bytes32(now); // for the timestamp
		bytes32[] memory tmp_params = contest.getEndpoints();
		for ( uint i = 1; i < tmp_params.length; i++) {
				params[i] = tmp_params[i-1];
		}

		queryId = dispatch.query(_gitOracle,"GitCommits",_endpoint,params);
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
