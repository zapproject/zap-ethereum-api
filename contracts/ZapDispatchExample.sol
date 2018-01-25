
/*
THIS IS AN EARLY EXPERIMENTAL DEMONSTRATION. DO NOT USE WITH REAL ETHER.
*/
import "ZapDispatch.sol";
import "ZapBondage.sol";


contract SampleClient1 {

  string public response1;
  event Result(string response1);

  ERC20 token;
  address dispatchAddress;
  ZapDispatch dispatch;
  ZapBondage bondage;

  function SampleClient1(address tokenAddress, address dispatchAddress, address bondageAddress){

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
YOUR QUERY: "0x48da300FA4A832403aF2369cF32d453c599616A6", "hr3101,house_passage,_1515733200"
*/
  function queryTest(address oracleAddress, string query, string enpoint) {

    bytes32 endpoint = "smartcontract";
    uint256 numZap = bondage.calcZapForDots(endpoint, 1, oracleAddress);
    if( (token.balanceOf(this) / (token.decimals/100)) >= numZap){
        token.approve(dispatchAddress, numZap * token.decimals );
        
        string args='1';
        bytes32 endpoint_params = [ZapDispatch.stringToBytes32(args)];
        ZapDispatch.query(oracleAddress, query, endpoint, endpoint_params);
    }
  }
  
}

