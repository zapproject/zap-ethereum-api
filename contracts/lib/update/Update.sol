pragma solidity ^0.4.19;

import "..//Destructible.sol";
import "../addressSpace/AddressSpace.sol";
import "../addressSpace/AddressSpacePointer.sol";

interface UpdatableContract { function updateContract() external; }

contract Update is Destructible {

    AddressSpacePointer pointer;
    AddressSpace addresses;

    UpdatableContract bondage;
    UpdatableContract arbiter;
    UpdatableContract dispatch;
    UpdatableContract currentCost;

    function Update(address pointerAddress) public {
        pointer = AddressSpacePointer(pointerAddress);
        addresses = AddressSpace(pointer.addresses());
        bondage = UpdatableContract(addresses.bondage());
        arbiter = UpdatableContract(addresses.arbiter());
        dispatch = UpdatableContract(addresses.dispatch());
        currentCost = UpdatableContract(addresses.currentCost());
    }

    function updateContracts() external {
        if (addresses != pointer.addresses()) addresses = AddressSpace(pointer.addresses());
        if (bondage != addresses.bondage()) bondage = UpdatableContract(addresses.bondage());
        if (arbiter != addresses.arbiter()) arbiter = UpdatableContract(addresses.arbiter());
        if (dispatch != addresses.dispatch()) dispatch = UpdatableContract(addresses.dispatch());
        if (currentCost != addresses.currentCost()) currentCost = UpdatableContract(addresses.currentCost());

        bondage.updateContract();
        arbiter.updateContract();
        dispatch.updateContract();
        currentCost.updateContract();
    }
}
