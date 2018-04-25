pragma solidity ^0.4.18;

import "./Ownable.sol";

contract Destructible is Ownable {
	function selfDestruct() public onlyOwner {
		selfdestruct(owner);
	}
}
