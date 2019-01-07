pragma solidity ^0.4.24;

import "./Token.sol";
import "./TokenFactoryInterface.sol";

contract TokenFactory is TokenFactoryInterface {
    function TokenFactory(){

    }

    function create(string _name, string _symbol) public returns (FactoryTokenInterface) {
        FactoryToken token = new FactoryToken(_name, _symbol);
        token.transferOwnership(msg.sender);
        return token;
    }
}
