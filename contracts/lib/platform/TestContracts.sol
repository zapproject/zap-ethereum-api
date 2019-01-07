pragma solidity ^0.4.24;

import "./Client.sol";
import "../../platform/dispatch/DispatchInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "./OnChainProvider.sol";
import "../ERC20.sol";

contract TestProvider is OnChainProvider {
    event RecievedQuery(string query, bytes32 endpoint, bytes32[] params);

    event TEST(uint res, bytes32 b, string s);

    bytes32 public spec1 = "Hello?";
    bytes32 public spec2 = "Reverse";
    bytes32 public spec3 = "Add";
    bytes32 public spec4 = "Double";

    bool AM_A_BAD_ORACLE;

    /* Endpoints to Functions:
    spec1: Hello? -> returns "Hello World"
    spec2: Reverse -> returns the query string in reverse
    spec3: Add -> Adds up the values in endpointParams
    */

    // curve 2x^2
    int[] curve = [3, 0, 0, 2, 1000000000];

    RegistryInterface registry;

    // middleware function for handling queries
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams, bool onchainSubscriber) external {
        emit RecievedQuery(userQuery, endpoint, endpointParams);
        if(AM_A_BAD_ORACLE) return;
        bytes32 _endpoint = endpoint;
        if(onchainSubscriber) {
            bytes32 hash = keccak256(abi.encodePacked(_endpoint));

            if(hash == keccak256(abi.encodePacked(spec1))){
                endpoint1(id, userQuery, endpointParams);
            } else if (hash == keccak256(abi.encodePacked(spec2))){
                endpoint2(id, userQuery, endpointParams);
            } else if (hash == keccak256(abi.encodePacked(spec3))){
                endpoint3(id, userQuery, endpointParams);
            } else if (hash == keccak256(abi.encodePacked(spec4))){
                endpoint4(id, userQuery, endpointParams);
            } else {
                revert("Invalid endpoint");
            }
        } // else: Do nothing (onchain only)
    }

    constructor(address registryAddress, bool isBad) public{
        registry = RegistryInterface(registryAddress);
        AM_A_BAD_ORACLE = isBad;

        // initialize in registry
        bytes32 title = "TestContract";

        bytes32[] memory params = new bytes32[](2);
        params[0] = "p1";
        params[1] = "p2";

        registry.initiateProvider(12345, title);

        registry.initiateProviderCurve(spec1, curve, address(0));
        registry.initiateProviderCurve(spec2, curve, address(0));
        registry.initiateProviderCurve(spec3, curve, address(0));
        registry.initiateProviderCurve(spec4, curve, address(0));
    }


    // return Hello World to query-maker
    function endpoint1(uint256 id, string /* userQuery */, bytes32[] /* endpointParams */) internal{
        DispatchInterface(msg.sender).respond1(id, "Hello World");
    }

    // return the hash of the query
    function endpoint2(uint256 id, string userQuery, bytes32[] /* endpointParams */) internal{
        // endpointParams
        string memory reversed = reverseString(userQuery);
        DispatchInterface(msg.sender).respond1(id, reversed);
    }

     // returns the sum of all values in endpointParams
    function endpoint3(uint256 id, string /* userQuery */, bytes32[] endpointParams) internal{
        uint sum = 0;
        for(uint i = 0; i<endpointParams.length; i++){
            uint value = uint(endpointParams[i]);
            sum += value;
        }

        bytes32[] memory res = new bytes32[](1);
        res[0] = bytes32(sum);

        DispatchInterface(msg.sender).respondBytes32Array(id, res);
    }

    // returns the sum of all values in endpointParams
    function endpoint4(uint256 id, string /* userQuery */, bytes32[] /* endpointParams */) internal{
        DispatchInterface(msg.sender).respond2(id, "Hello", "World");
    }

    function reverseString(string _base) internal pure returns (string){
        bytes memory _baseBytes = bytes(_base);
        string memory _tempValue = new string(_baseBytes.length);
        bytes memory _newValue = bytes(_tempValue);

        for(uint i=0;i<_baseBytes.length;i++){
            _newValue[ _baseBytes.length - i - 1] = _baseBytes[i];
        }

        return string(_newValue);
    }


    function bytes32ToString (bytes32 data) internal pure returns (string) {
        bytes memory bytesString = new bytes(32);
        for (uint j=0; j<32; j++) {
            byte char = byte(bytes32(uint(data) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[j] = char;
            }
        }
        return string(bytesString);
    }

}

/* Test Subscriber Client */
contract TestClient is Client1, Client2{

    event MadeQuery(address oracle, string query, uint256 id);
    event Result1(uint256 id, string response1);
    event Result1(uint256 id, bytes32 response1);
    event Result2(uint256 id, string response1, string response2);

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
    Implements overloaded callback functions for Client1
    */
    function callback(uint256 id, string response1) external {
        string memory _response1 = response1;
        emit Result1(id, _response1);
        // do something with result
    }

    function callback(uint256 id, bytes32[] response) external {
        emit Result1(id, response[0]);
        // do something with result
    }

    // Client2 callback
    function callback(uint256 id, string response1, string response2) external {
        emit Result2(id, response1, response2);
        // do something with result
    }

    function testQuery(address oracleAddr, string query, bytes32 specifier, bytes32[] params) external returns (uint256) {
        uint256 id = dispatch.query(oracleAddr, query, specifier, params);
        emit MadeQuery(oracleAddr, query, id);
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

    // attempts to cancel an existing query
    function cancelQuery(uint256 id) external {
        dispatch.cancelQuery(id);
    }

}
