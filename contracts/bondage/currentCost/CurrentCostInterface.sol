pragma solidity ^0.4.24;

contract CurrentCostInterface {    
    function _currentCostOfDot(address, bytes32, uint256) public view returns (uint256);
}
