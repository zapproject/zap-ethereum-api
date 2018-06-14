pragma solidity ^0.4.24;

import "./Client.sol";
import "../dispatch/DispatchInterface.sol";
import "../bondage/BondageInterface.sol";
import "../registry/RegistryInterface.sol";
import "./OnChainProvider.sol";
import "../lib/ERC20.sol";

contract TestProvider is OnChainProvider {
	event RecievedQuery(string query, bytes32 endpoint, bytes32[] params);

    bytes32 public specifier = "spec01";

    // curve 2x^2
    int[] constants = [2, 2, 0];
    uint[] parts = [0, 1000000000];
    uint[] dividers = [1]; 

    RegistryInterface registry;

	function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
        // do something with
		emit RecievedQuery(userQuery, endpoint, endpointParams);
		Dispatch(msg.sender).respond1(id, "Hello World");
	}

    constructor(address registryAddress) public{

        registry = RegistryInterface(registryAddress);

        // initialize in registry
        bytes32 spec = "spec01";
        bytes32 title = "TestContract";

        bytes32[] memory params = new bytes32[](2);
        params[0] = "p1";
        params[1] = "p2";

        registry.initiateProvider(12345, title, spec, params);
        registry.initiateProviderCurve(specifier, constants, parts, dividers);
    }
}

/* Test Subscriber Client */
contract TestClient is Client1{

	event Result1(uint256 id, string response1);
	event Result2(string response1, string response2);
	event Result3(string response1, string response2, string response3);
	event Result4(string response1, string response2, string response3, string response4);

	ERC20 token;
	DispatchInterface dispatch;
	BondageInterface bondage;
    RegistryInterface registry;

	constructor(address tokenAddress, address dispatchAddress, address bondageAddress, address registryAddress) public {
		token = ERC20(tokenAddress);
		dispatch = DispatchInterface(dispatchAddress);
		bondage = BondageInterface(bondageAddress);
        registry = RegistryInterface(registryAddress);
	}

    /*
    Implements callback function for Client1
    */
    function callback(uint256 id, string response1) external {
    	string memory _response1 = response1;
    	emit Result1(id, _response1);
    }

    function testQuery(address oracleAddr, string query, bytes32 specifier, bytes32[] params) external {
    	dispatch.query(oracleAddr, query, specifier, params, true);
    }

    function stringToBytes32(string memory source) internal pure returns (bytes32 result) {
    	bytes memory tempEmptyStringTest = bytes(source);

    	if (tempEmptyStringTest.length == 0) {
    		return 0x0;
    	}
    	assembly {
    		result := mload(add(source, 32))
    	}
    }

}
