pragma solidity ^0.5.0;

import "./Token.sol";
import "./TokenFactoryInterface.sol";

contract TokenFactory is TokenFactoryInterface {

    function create(string memory _name, string memory _symbol) public returns (FactoryTokenInterface) {
        FactoryToken token = new FactoryToken(_name, _symbol);
        token.transferOwnership(msg.sender);
        return token;
    }
}
