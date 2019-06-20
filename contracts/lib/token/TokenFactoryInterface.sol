pragma solidity ^0.5.0;

import "./FactoryTokenInterface.sol";

contract TokenFactoryInterface {
    function create(string memory _name, string memory _symbol) public returns (FactoryTokenInterface);
}
