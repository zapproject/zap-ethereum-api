pragma solidity ^0.4.19;
// v1.0

import "../Mortal.sol";
import "../../registry/RegistryInterface.sol";
import "../../bondage/currentCost/CurrentCostInterface.sol";
import "../../bondage/BondageInterface.sol";
import "../../arbiter/ArbiterInterface.sol";
import "../../dispatch/DispatchInterface.sol";

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

    // SETTERS //
    function setRegistryAddress(address _registry) public onlyOwner { registry = _registry; }
    function setBondageAddress(address _bondage) public onlyOwner { bondage = _bondage; }
    function setArbiterAddress(address _arbiter) public onlyOwner { arbiter = _arbiter; }
    function setDispatchAddress(address _dispatch) public onlyOwner { dispatch = _dispatch; }
    function setCurrentCostAddress(address _currentCost) public onlyOwner { currentCost = _currentCost; }

    // CONTRACT FACTORIES //
    function instantiateRegistry(
        RegistryInterface instance
    )
        external
        view
        returns (RegistryInterface)
    {
        if (instance != registry) return RegistryInterface(registry);
    }

    function instantiateBondage(
        BondageInterface instance
    )
        external
        view
        returns (BondageInterface)
    {
        if (instance != bondage) return BondageInterface(bondage);
    }

    function instantiateArbiter(
        ArbiterInterface instance
    )
        external
        view
        returns (ArbiterInterface)
    {
        if (instance != arbiter) return ArbiterInterface(arbiter);
    }

    function instantiateDispatch(
        DispatchInterface instance
    )
        external
        view
        returns (DispatchInterface)
    {
        if (instance != dispatch) return DispatchInterface(dispatch);
    }

    function instantiateCurrentCost(
        CurrentCostInterface instance
    ) 
        external
        view
        returns (CurrentCostInterface)
    { 
        if (instance != currentCost) return CurrentCostInterface(currentCost); 
    }
}