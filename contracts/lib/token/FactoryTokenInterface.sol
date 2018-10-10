pragma solidity ^0.4.0;

import "../ownership/Ownable.sol";

contract FactoryTokenInterface is Ownable {
    function balanceOf(address _owner) public view returns (uint256);
    function transfer(address _to, uint256 _value) public returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool);
    function approve(address _spender, uint256 _value) public returns (bool);
    function allowance(address _owner, address _spender) public view returns (uint256);
    function mint(address _to, uint256 _amount) public returns (bool);
    function burnFrom(address _from, uint256 _value) public;
}
