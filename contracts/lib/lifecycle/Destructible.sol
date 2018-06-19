pragma solidity ^0.4.24;

import "../ownership/Ownable.sol";

contract Destructible is Ownable {
	function selfDestruct() public onlyOwner {
		selfdestruct(owner);
	}
}
