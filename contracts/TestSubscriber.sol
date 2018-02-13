pragma solidity ^0.4.17;

/*
THIS IS AN EARLY EXPERIMENTAL DEMONSTRATION. DO NOT USE WITH REAL ETHER.
*/
import "./ZapDispatch.sol";
import "./ZapBondage.sol";


contract TestSubscriber {

    string public response1;
    bytes32 public specifier = "spec01";

    event Result(string response1);

    ERC20 token;
    ZapDispatch dispatch;
    ZapBondage bondage;

    function TestSubscriber(address tokenAddress, address dispatchAddress, address bondageAddress) {
        token = ERC20(tokenAddress);
        dispatch = ZapDispatch(dispatchAddress);
        bondage = ZapBondage(bondageAddress);
    }

    /*
    HANDLE PROVIDERS RESPONSE HERE: house_passage ("true" or "false")
    */
    function __zapCallback(uint256 id, string _response1) public {
        response1 = _response1;
        Result(_response1);
    }

    /*
    SPECIFY DATA PROVIDER FROM WHAT YOU WILL RECEIVING DATA, AND PAY FOR IT
    */
    function bondToOracle(address provider, uint256 numberOfDataRequests) {
        uint256 numZap = bondage.calcZapForDots(specifier, numberOfDataRequests, provider);
        if ((token.balanceOf(this) / (token.decimals() / 100)) >= numZap) {
            token.approve(dispatch, numZap * token.decimals());
            bondage.bond(specifier, numZap, provider);
        }
    }

    /*
    YOUR QUERY: "0x48da300FA4A832403aF2369cF32d453c599616A6", "hr3101,house_passage,_1515733200"
    */
    function queryTest(address provider, string query) public {
        bytes32[] memory endpoint_params = new bytes32[](1);
        endpoint_params[0] = stringToBytes32("1");
        dispatch.query(provider, this, query, specifier, endpoint_params);
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

