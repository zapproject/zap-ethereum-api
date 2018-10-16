pragma solidity ^0.4.0;

import "./FactoryTokenInterface.sol";

contract TokenFactoryInterface {
    function create(string _name, string _symbol) public returns (FactoryTokenInterface);
}
