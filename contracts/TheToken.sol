pragma solidity ^0.4.17;

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!
// THIS NEEDS A MAJOR REFACTOR!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!

library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a * b;
        assert(a == 0 || c / a == b);
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}


contract ERC20Basic {
    uint256 public totalSupply;
    function balanceOf(address who) public view returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}


/// @title ERC20 interface
/// @dev See https://github.com/ethereum/EIPs/issues/20
contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract BasicToken is ERC20Basic {
    using SafeMath for uint256;
    mapping(address => uint256) balances;

    /// @dev Transfer token to a specified address
    /// @param to The address to transfer to
    /// @param value The amount to be transferred
    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0));
        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(value);
        balances[to] = balances[to].add(value);
        Transfer(msg.sender, to, value);
        return true;
    }
    
    /// @dev Get the balance of the specified address
    /// @param owner The address to query the the balance of
    /// @return The amount owned by the passed address
    function balanceOf(address owner) public view returns (uint256 balance) {
        return balances[owner];
    }
}


contract Ownable {
    address public owner;
    event OwnershipTransferred(
        address indexed previousOwner, 
        address indexed newOwner);
     
    /// @dev Set the original `owner` of the contract to the sender account
    function Ownable() public { owner = msg.sender; }

    /// @dev Throws if called by any account other than the owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /// @dev Transfers control of the contract to a newOwner
    /// @param newOwner The address to transfer ownership to
    function transferOwnership(address newOwner) onlyOwner public {
        require(newOwner != address(0));
        OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}


contract StandardToken is ERC20, BasicToken {
    mapping (address => mapping (address => uint256)) allowed;
    
    /// @dev Transfer tokens from one address to another
    /// @param from address The address which you want to send tokens from
    /// @param to address The address which you want to transfer to
    /// @param value uint256 the amount of tokens to be transferred
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(to != address(0));
        uint256 allowance = allowed[from][msg.sender];
        // Check is not needed because 
        // sub(allowance, value) will already throw if this condition is not met.
        // require (value <= allowance);
        balances[from] = balances[from].sub(value);
        balances[to] = balances[to].add(value);
        allowed[from][msg.sender] = allowance.sub(value);
        Transfer(from, to, value);
        return true;
    }

    /// @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
    /// Beware that changing an allowance with this method 
    /// brings the risk that someone may use both the old and the new allowance 
    /// by unfortunate transaction ordering. 
    /// One possible solution to mitigate this race condition 
    /// is to first reduce the spender's allowance to 0 and set the desired value afterwards.
    /// https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    /// @param spender The address which will spend the funds.
    /// @param value The amount of tokens to be spent.
    function approve(address spender, uint256 value) public returns (bool) {
        allowed[msg.sender][spender] = value;
        Approval(msg.sender, spender, value);
        return true;
    }

    /// @dev Function to check the amount of tokens that an owner is allowed to a spender.
    /// @param owner address The address which owns the funds.
    /// @param spender address The address which will spend the funds.
    /// @return A uint256 specifying the amount of tokens still available for the spender.
    function allowance(address owner, address spender) public view returns (uint256 remaining) {
        return allowed[owner][spender];
    }

    /// @dev Approve should be called when allowed[spender] == 0. 
    /// To increment allowed value, it is better to use this function 
    /// to avoid 2 calls (and wait until the first transaction is mined)
    /// From MonolithDAO Token.sol
    function increaseApproval(address spender, uint addedValue) public returns (bool success) {
        allowed[msg.sender][spender] = allowed[msg.sender][spender].add(addedValue);
        Approval(msg.sender, spender, allowed[msg.sender][spender]);
        return true;
    }
    
    function decreaseApproval (address spender, uint subtractedValue) public returns (bool success) {
        uint oldValue = allowed[msg.sender][spender];
        if (subtractedValue > oldValue) {
            allowed[msg.sender][spender] = 0;
        } else {
            allowed[msg.sender][spender] = oldValue.sub(subtractedValue);
        }
        Approval(msg.sender, spender, allowed[msg.sender][spender]);
        return true;
    }
}


contract MintableToken is StandardToken, Ownable {
    event Mint(address indexed to, uint256 amount);
    event MintFinished();
    
    bool public mintingFinished = false;
    
    modifier canMint() {
        require(!mintingFinished);
        _;
    }
    
    /// @dev Function to mint tokens
    /// @param to The address that will receive the minted tokens.
    /// @param amount The amount of tokens to mint.
    /// @return A boolean that indicates if the operation was successful.
    function mint(address to, uint256 amount) 
        onlyOwner 
        canMint 
        public 
        returns (bool) 
    {
        totalSupply = totalSupply.add(amount);
        balances[to] = balances[to].add(amount);
        Mint(to, amount);
        Transfer(0x0, to, amount);
        return true;
    }
    
    /// @dev Function to stop minting new tokens.
    /// @return True if the operation was successful.
    function finishMinting() onlyOwner public returns (bool) {
        mintingFinished = true;
        MintFinished();
        return true;
    }
}


contract TheToken is MintableToken {
    string public name = "TEST TOKEN";
    string public symbol = "TEST";
    uint256 public decimals = 18;

    function allocate(address to, uint amount) public {
        mint(to, amount);
    } 
}
