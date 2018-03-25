pragma solidity ^0.4.17;
// v1.0

import "../Ownable.sol";

contract AddressSpacePointer is Ownable {
	address public addresses;
	function setAddressSpace(address _addresses) external onlyOwner { addresses = _addresses; }
}