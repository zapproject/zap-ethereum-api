pragma solidity ^0.4.18;

contract Token {
    function transfer(address to, uint256 amount) public returns (bool);
    function balanceOf(address addr) public view returns (uint256);
}
            
contract Faucet {
    Token token;
    address public owner;
    address public tokenAddress;

    uint public decimals = 10 ** 18;
    uint public rate = 1 * decimals / 1000; //change to whatever

    // 1: 1000 ratio
    
    modifier ownerOnly {
        require(msg.sender == owner,"Error: Owner Only Error"); 
        _;
    }
           
    constructor(address _token, address _owner) public {
        tokenAddress = _token;
        token = Token(_token);
        owner = _owner;
    }
    
    event Log(uint256 n1, uint256 n2);
    
    function buyZap() public payable {
        if(msg.value > 0) {
            uint256 amt = (msg.value / rate);
            amt = amt * decimals;
            if(amt <= token.balanceOf(this))
                token.transfer(msg.sender, amt);                
        }
        else {
            revert();
        }
    }
  
    function setOwner(address _owner) public ownerOnly {
        require(_owner != address(0), "Error: Address cannot be zero");
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
