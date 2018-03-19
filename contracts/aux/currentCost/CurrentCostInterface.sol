pragma solidity ^0.4.17;

import "../../registry/RegistryInterface.sol";

interface CurrentCostInterface {    
    function _currentCostOfDot(RegistryInterface, address, bytes32, uint256) public view returns (uint256);
}