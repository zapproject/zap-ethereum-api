pragma solidity ^0.4.21;
// v1.0

import "../Mortal.sol";

contract AddressSpace is Mortal {

    address public registry;
    address public bondage;
    address public arbiter;
    address public dispatch;    
    address public currentCost;

    function AddressSpace(
        address _registry,
        address _bondage,
        address _arbiter,
        address _dispatch,
        address _currentCost
    )
        public
    {
        setRegistryAddress(_registry);
        setBondageAddress(_bondage);
        setArbiterAddress(_arbiter);
        setDispatchAddress(_dispatch);
        setCurrentCostAddress(_currentCost);
    }

    function setRegistryAddress(address _registry) public onlyOwner { registry = _registry; }
    function setBondageAddress(address _bondage) public onlyOwner { bondage = _bondage; }
    function setArbiterAddress(address _arbiter) public onlyOwner { arbiter = _arbiter; }
    function setDispatchAddress(address _dispatch) public onlyOwner { dispatch = _dispatch; }
    function setCurrentCostAddress(address _currentCost) public onlyOwner { currentCost = _currentCost; }
}
