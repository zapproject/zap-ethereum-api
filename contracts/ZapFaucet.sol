contract Token {
                uint256 public decimals = 18;
                function transfer(address _to, uint256 _amount) returns (bool);
                function balanceOf(address _addr) constant returns (uint256 bal);
            }
            
    contract ZapFaucet {
                Token token;
                uint256 public amt;
                address public owner;
                address public tokenAddress;
            
                uint public decimals = 10**13;
                uint public rate = 26 * decimals;//change to whatever
                
                modifier ownerOnly {
                    require(msg.sender == owner); 
                    _;
        }
            
    function ZapFaucet(address _token, address _owner) {
                    tokenAddress = _token;
                    token = Token(_token);
                    owner = _owner;
    }
    
    event Log(uint256 n1, uint256 n2);
    
    function() payable {
        if((msg.value > 0)){
            Log(msg.value, rate);

            uint256 weiAmount = msg.value * (10 ** token.decimals());
            amt = (weiAmount / rate);

            Log(amt, token.balanceOf(this));
            if(amt <= token.balanceOf(this)){
                token.transfer(msg.sender, amt);                
            }
        }
        else{
            revert();
        }
    }
  
    function setOwner(address _owner) ownerOnly {
        require(_owner != address(0));
        owner = _owner;
    }
    
    function withdrawZap() ownerOnly{
        if (owner != msg.sender) revert();
        token.transfer(owner, token.balanceOf(this));        
    }
    
    function withdrawEther() ownerOnly{
        if (owner != msg.sender) revert();
        owner.send(this.balance);
    }
    
    
}
