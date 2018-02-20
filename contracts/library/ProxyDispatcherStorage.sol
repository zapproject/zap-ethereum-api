pragma solidity ^0.4.17;

contract Ownable {
    address public owner;
    event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner);

    /// @dev Set the original `owner` of the contract to the sender account
    function Ownable() { owner = msg.sender; }

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

contract ProxyDispatcherStorage is Ownable {
    address public lib;

    function ProxyDispatcherStorage(address newLib) public {
        replace(newLib);
    }

    function replace(address newLib) public onlyOwner /* onlyDAO */ {
        lib = newLib;
    }
}
