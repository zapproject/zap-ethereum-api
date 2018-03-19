pragma solidity ^0.4.17;

import "../../registry/RegistryInterface.sol";

interface CurrentCostInterface {    
    function _currentCostOfDot(RegistryInterface, address, bytes32, uint256) external view returns (uint256);
}