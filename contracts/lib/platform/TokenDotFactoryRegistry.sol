pragma solidity ^0.4.24;

import "../ownership/Ownable.sol";
import "../ownership/ZapCoordinatorInterface.sol";

contract TokenDotFactoryRegistry is Ownable {

    address[] public registered;
    ZapCoordinatorInterface public coord;

    event Registered(address indexed _from, address indexed _registered, uint256 _timestamp);

    constructor(address coordinator) public {
        coord = ZapCoordinatorInterface(coordinator);
        coord.updateContract("TDF_REGISTRY", this);
    }

    function register(address _addr) public {
        registered.push(_addr);
        emit Registered(msg.sender, _addr, now);
    }
}
