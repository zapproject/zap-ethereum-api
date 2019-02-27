pragma solidity ^0.4.24;

import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "./OnChainProvider.sol";


contract SampleOnChainOracle is OnChainProvider, Ownable {

    event RecievedQuery(string query, bytes32 endpoint, bytes32[] params);

    ZapCoordinatorInterface coord;
    RegistryInterface registry;
    DispatchInterface dispatch;

    //initialize provider
    constructor(
        address coordinator, 
        uint256 providerPubKey,
        bytes32 providerTitle 
    ){
        coord = ZapCoordinatorInterface(coordinator); 

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        registry.initiateProvider(providerPubKey, providerTitle);
    }

    //initialize an endpoint curve
    function initializeCurve(
        bytes32 specifier, 
        int256[] curve
    ) onlyOwner public returns(bool) {
        
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        require(registry.isProviderInitiated(address(this)), "Provider not intiialized");

        return registry.initiateProviderCurve(specifier, curve, address(0));
    }

    function setProviderParameter(bytes32 key, bytes value) onlyOwner public {

        registry = RegistryInterface(coord.getContract('REGISTRY'));
        registry.setProviderParameter(key, value);
    }

    function setEndpointParams(bytes32 endpoint, bytes32[] endpointParams) onlyOwner public {

        registry = RegistryInterface(coord.getContract('REGISTRY'));
        registry.setEndpointParams(endpoint, endpointParams);
    }

    // middleware function for handling queries
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external {

        emit RecievedQuery(userQuery, endpoint, endpointParams);
        
        dispatch = DispatchInterface(coord.getContract('DISPATCH'));
        if(onchainSubscriber && msg.sender == address(dispatch)) {

          //Do something
          dispatch.respond1(id, "Hello World");

        } 
        // else: Do nothing (onchain only)
    }

}
