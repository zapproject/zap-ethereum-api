pragma solidity ^0.4.18;

contract Token {
    function transfer(address to, uint256 amount) public returns (bool);
    function balanceOf(address addr) constant public returns (uint256);
}
            
contract Faucet {
    Token token;
    uint256 public amt;
    address public owner;
    address public tokenAddress;

    uint public decimals = 10 ** 13;
    uint public rate = 26 * decimals; //change to whatever
    
    modifier ownerOnly {
        require(msg.sender == owner); 
        _;
    }
           
    constructor(address _token, address _owner) public {
        tokenAddress = _token;
        token = Token(_token);
        owner = _owner;
    }
    
    event Log(uint256 n1, uint256 n2);
    
    function() public payable {
        if(msg.value > 0) {
            emit Log(msg.value, rate);
            amt = (msg.value / rate);
            amt = amt * (10 ** 18);
            emit Log(amt, token.balanceOf(this));
            if(amt <= token.balanceOf(this))
                token.transfer(msg.sender, amt);                
        }
        else {
            revert();
        }
    }
  
    function setOwner(address _owner) public ownerOnly {
        require(_owner != address(0));
        owner = _owner;
    }
    
    function withdrawTok() public ownerOnly {
        if (owner != msg.sender) revert();
        token.transfer(owner, token.balanceOf(this));        
    }
    
    function withdrawEther() public ownerOnly {
        if (owner != msg.sender) revert();
        owner.transfer(address(this).balance);
    }   
}
