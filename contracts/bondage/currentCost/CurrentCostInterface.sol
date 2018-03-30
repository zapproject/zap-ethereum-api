pragma solidity ^0.4.19;

interface CurrentCostInterface {    
    function _currentCostOfDot(address, bytes32, uint256) external view returns (uint256);
}
