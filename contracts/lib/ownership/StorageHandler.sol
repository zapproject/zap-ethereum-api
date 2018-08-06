pragma solidity ^0.4.24;

import "./Ownable.sol";

contract StorageHandler is Ownable {
    event StorageTransferred(address indexed previousStorage,address indexed newStorage);

    address public storageAddress;

    constructor() public {}

    /// @dev Allows the current owner to transfer storage of the contract to a newStorage.
    /// @param newStorage The address of the new storage contract to.
    function setStorage(address newStorage) public onlyOwner {
       require(newStorage != address(0));
       require(Ownable(newStorage).owner() == this.owner());
       emit StorageTransferred(storageAddress, newStorage);
       storageAddress = newStorage;
    }
}