pragma solidity ^0.4.24;

import "../../platform/registry/RegistryInterface.sol";
import "./OnChainProvider.sol";

contract Telegram is OnChainProvider {
    bytes32 public spec1 = "loomdart";
    uint256 decimals = 10 ** 18;

    // curve y=1/5 (1 zap = 5 dots)
    int[] constants = [1*10**18/5, 0, 2];

    uint[] parts = [0, 1000000000];
    uint[] dividers = [1]; 

    RegistryInterface registry;

    // middleware function for handling queries
	function receive(uint256 /* id */, string /* userQuery */, bytes32 /* endpoint */, bytes32[] /* endpointParams */, bool /* onchainSubscriber*/) external {
	}

    constructor(address registryAddress) public{
        registry = RegistryInterface(registryAddress);

        // initialize in registry
        bytes32 title = "Telegram Registration";

        bytes32[] memory params = new bytes32[](2);
        params[0] = "p1";
        params[1] = "p2";

        registry.initiateProvider(123, title, spec1, params);
        registry.initiateProviderCurve(spec1, constants, parts, dividers);
    }
}