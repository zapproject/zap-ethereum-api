// 30 grand of zap maxmimum really allowed 

contract Token {
    function transfer(address _to, uint256 _amount) returns (bool);
    function balanceOf(address _addr) constant returns (uint256 bal);
}

contract ZapFaucet {
    Token token;
    uint256 amt;
    address owner;
    uint rate = 1000;
    uint decimals = 18;
    
    modifier ownerOnly {
        require(msg.sender == owner); 
        _;
    }

    function ZapFaucet(address _token, uint256 _rate) {
        token = Token(_token);
        rate = _rate;
        owner = msg.sender;
    }
    
    function getZap() payable {
        if(msg.value > 0){
            amt = msg.value * rate;
            if(amt < token.balanceOf(this)){
                token.transfer(msg.sender, amt);                
            }
        }
        else{
            revert();
        }
    }
  
    function returnZap(){
        if (owner != msg.sender) revert();
        token.transfer(owner, token.balanceOf(this));
    }
  
    function changeAmount(uint256 _rate) ownerOnly {
        if (owner != msg.sender) revert();
        rate = _rate;
    }
  
    function setOwner(address _owner) ownerOnly {
        require(_owner != address(0));
        owner = _owner;
    }
}
