pragma solidity ^0.4.25;
import "./SampleContest.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./Client.sol";


contract MostBondedByDateContest is Ownable, ClientIntArray {
  SampleContest public contest;
  ZapCoordinatorInterface public coordinator;
  uint256 public query_id;
  uint256 public endtime;

  constructor(
    address _cord,
    address _contest,
    uint256 _endtime
  ){
    contest = SampleContest(_contest);
    coordinator = ZapCoordinatorInterface(_cord);
    endtime = _endtime;
  }

  function settle() {
    require(contest.getStatus()==1,"Contest is in initialized state"); 
    require(now > endtime, "Contest is still active");
    address bondageAddress = coordinator.getContract("BONDAGE");
    BondageInterface bondage = BondageInterface(bondageAddress);
    bytes32[] memory endpoints = contest.getEndpoints();
    bytes32 winner;
    uint256 max = 0;
    uint256 bound;
    for (uint256 i = 0; i < endpoints.length; i++) {
        bound = bondage.getZapBound(address(contest), endpoints[i]); 
        if (bound > max) {
            max = bound;
            winner = endpoints[i];
        }
    }
    contest.judge(winner);
  }

  function getEndTime() returns(uint256) {
    return endtime;
  }
}
