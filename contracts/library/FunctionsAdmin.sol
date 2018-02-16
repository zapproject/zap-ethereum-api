pragma solidity ^0.4.17;

import "./interface/FunctionsInterface.sol";

contract FunctionsAdmin {
    FunctionsInterface public functions;
    address public adminAddress;

    modifier adminOnly {
        require(msg.sender == adminAddress);
        _;
    }

    function FunctionsAdmin() {
        adminAddress = msg.sender;
    }

    function changeAdmin(address _admin) public adminOnly {
        adminAddress = _admin;
    }

    function setFunctionsAddress(address _functions) public adminOnly {
        functions = FunctionsInterface(_functions);
    }

}