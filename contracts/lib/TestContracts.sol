pragma solidity ^0.4.24;

import "./Client.sol";
import "../dispatch/DispatchInterface.sol";
import "../bondage/BondageInterface.sol";
import "./OnChainProvider.sol";
import "../lib/ERC20.sol";

contract TestProvider is OnChainProvider {
	event RecievedQuery(string received);

	function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external {
		emit RecievedQuery("Hello World");
		Dispatch(msg.sender).respond1(id, "Hello World");
	}
}

contract TestClient is Client1{

	string public response1;
	bytes32 public specifier = "spec01";

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

	ERC20 token;
	DispatchInterface dispatch;
	BondageInterface bondage;

	constructor(address tokenAddress, address dispatchAddress, address bondageAddress) public {
		token = ERC20(tokenAddress);
		dispatch = DispatchInterface(dispatchAddress);
		bondage = BondageInterface(bondageAddress);
	}

    /*
    Implements callback function for Client1
    */
    function callback(uint256 id, string response1) external {
    	string memory _response1 = response1;
    	emit Result1(_response1);
    }

  	/*
    SPECIFY DATA PROVIDER FROM WHAT YOU WILL RECEIVING DATA, AND PAY FOR IT
    */
    function bondToOracle(address provider, uint256 numberOfDataRequests) public {
    	uint256 balance = token.balanceOf(this);
    	emit TESTING(balance);
    	uint256 numZap = bondage.calcZapForDots(provider, specifier, numberOfDataRequests);
    	emit TESTING(numZap);
    	uint256 bondageDecimals = 10 ** token.decimals();
    	uint256 availableZap = balance;
    	if (availableZap >= numZap) {
    		token.approve(bondage, numZap * bondageDecimals);
    		bondage.bond(provider, specifier, numZap);
    	}
    }

    /*
    YOUR QUERY: "0x48da300FA4A832403aF2369cF32d453c599616A6", "hr3101,house_passage,_1515733200"
    */
    function queryTest(address provider, string query) public returns(uint256 ) {
    	bytes32[] memory endpoint_params = new bytes32[](1);
    	endpoint_params[0] = stringToBytes32("1");
    	uint256 id = dispatch.query(provider, query, specifier, endpoint_params); // should return hello world
    	return id;
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
