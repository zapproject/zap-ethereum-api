pragma solidity ^0.4.24;

import "./FactoryTokenInterface.sol";

contract TokenFactoryInterface {
    function create(string _name, string _symbol) public returns (FactoryTokenInterface);
}
