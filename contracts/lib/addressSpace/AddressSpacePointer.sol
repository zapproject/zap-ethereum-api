pragma solidity ^0.4.19;

import "../Ownable.sol";

contract AddressSpacePointer is Ownable {
    address public addresses;
    function setAddressSpace(address _addresses) external onlyOwner {addresses = _addresses; }
}