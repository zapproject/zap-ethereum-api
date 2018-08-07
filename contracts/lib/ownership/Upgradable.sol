import "../../lib/ownership/ZapCoordinator.sol";

pragma solidity ^0.4.24;

contract Upgradable {

	address coordinatorAddr;
	ZapCoordinator coordinator;

	constructor(address c) public{
		coordinatorAddr = c;
		coordinator = ZapCoordinator(c);
	}

    function updateDependencies() external coordinatorOnly {
       _updateDependencies();
    }

    function _updateDependencies() internal;

    modifier coordinatorOnly() {
    	require(msg.sender == coordinatorAddr);
    	_;
    }
}
