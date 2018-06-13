pragma solidity ^0.4.24;

import "./Client.sol";
import "../dispatch/DispatchInterface.sol";
import "../bondage/BondageInterface.sol";
import "../registry/RegistryInterface.sol";
import "./OnChainProvider.sol";
import "../lib/ERC20.sol";

contract TestProvider is OnChainProvider {
	event RecievedQuery(string received);

    bytes32 public specifier = "spec01";

    bytes32[] endpointParams;
    // curve 2x^2
    int[] constants = [2, 2, 2];
    uint[] parts = [0, 1000000000];
    uint[] dividers = [1]; 

    RegistryInterface registry;

	function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
		emit RecievedQuery("Hello World");
		Dispatch(msg.sender).respond1(id, "Hello World");
	}

    constructor(address registryAddress){

        registry = RegistryInterface(registryAddress);

        // initialize in registry
        bytes32 spec = "spec01";
        bytes32 title = "TestContract";

        bytes32 p1 = "a";
        bytes32 p2 = "b";
        bytes32[] memory params = new bytes32[](2);
        params[0] = "p1";
        params[1] = "p2";

        registry.initiateProvider(12345, title, spec, params);
        registry.initiateProviderCurve(specifier, constants, parts, dividers);
    }
}

contract TestClient is Client1{

	event Result1(string response1);
	event Result2(string response1, string response2);
	event Result3(string response1, string response2, string response3);
	event Result4(string response1, string response2, string response3, string response4);

	event NumZapReceived(uint256 numZap);
    event TokensApproved(bool isApproved);
    event Bonded();
    event BalanceReceived(uint256 balance);
    event AvailableZapCalculated(uint256 zap);
    event LogDecimals(uint256 decimals, uint256 bondage_decimals);

    event TESTING(uint256 integer);

    string public response1;

	ERC20 token;
	DispatchInterface dispatch;
	BondageInterface bondage;
    RegistryInterface registry;

	constructor(address tokenAddress, address dispatchAddress, address bondageAddress, address registryAddress) public {
		token = ERC20(tokenAddress);
		dispatch = DispatchInterface(dispatchAddress);
		bondage = BondageInterface(bondageAddress);
        registry = RegistryInterface(registryAddress);

        emit TESTING(69);
	}

    /*
    Implements callback function for Client1
    */
    function callback(uint256 id, string response1) external {
    	string memory _response1 = response1;
    	emit Result1(_response1);
    }

    function testQuery(address oracleAddr, string query, bytes32 specifier, bytes32[] params) external {
        emit TESTING(1001);
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
