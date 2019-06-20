pragma solidity ^0.5.0;

import "../ownership/Ownable.sol";


//was not compiling with selfdestruct(owner) added a require and changed parameter from owner to msg.sender


contract Destructible is Ownable {
    function selfDestruct() public onlyOwner {
        require(owner == msg.sender);
        selfdestruct(msg.sender);
    }
}
