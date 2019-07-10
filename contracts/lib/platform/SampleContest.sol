import "../token/TokenFactoryInterface.sol";
import "../token/FactoryTokenInterface.sol";
import "../ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../../platform/bondage/currentCost/CurrentCostInterface.sol";

/*
Contest where users can bond to contestant curves which mint tokens( unbondabe*),
winner decided by oracle
contract unbonds from loser curves
holders of winning token allowed to take share of reserve token(zap) which was unbonded from loser curves

Starting Contest:

    deploys with contest uninitialized: status = Uninitialized

    anyone can initialize new token:backed curve

    owner initializes contest with oracle: status = Initialized

Ending Contest:

    owner calls close: status = ReadyToSettle

    oracle calls judge to set winning curve: status = Judged

    anyone calls settle, contest unbonds from losing curves: status = Settled

    holders of winnning token call redeem to retrieve their share of reserve token
    based on their holding of winning token

    *holders of winning token can optionally unbond
*/

contract SampleContest is Ownable {

    CurrentCostInterface currentCost;
    FactoryTokenInterface public reserveToken;
    ZapCoordinatorInterface public coord;
    TokenFactoryInterface public tokenFactory;
    BondageInterface bondage;

    enum ContestStatus {
        Uninitialized,      //
        Initialized,       // ready for buys
        Expired,          // Oracle did not respond in time -> ready to refund
        Judged,          // winner determined
        Settled         // value of winning tokens determined
    }

    address public oracle;    // address of oracle who will choose the winner
    uint256 public ttl;    // time allowed before, close and judge. if time expired, allow unbond from all curves
    bytes32 public winner;    // curve identifier of the winner
    uint256 public winValue;  // final value of the winning token
    ContestStatus public status; //state of contest

    mapping(bytes32 => address) public curves; // map of endpoint specifier to token-backed dotaddress
    bytes32[] public curves_list; // array of endpoint specifiers

    mapping(address => uint8) public redeemed; // map of address redemption state
    address[] public redeemed_list;

    event DotTokenCreated(address tokenAddress);
    event Bonded(bytes32 indexed endpoint, uint256 indexed numDots, address indexed sender);
    event Unbonded(bytes32 indexed endpoint,uint256 indexed amount, address indexed sender);

    event Initialized(address indexed oracle);
    event Closed();
    event Judged(bytes32 winner);
    event Settled(uint256 winValue, uint256 winTokens);
    event Expired(bytes32 endpoint, uint256 totalDots);
    event Reset();

    constructor(
        address coordinator,
        address factory,
        uint256 providerPubKey,
        bytes32 providerTitle
    ){
        coord = ZapCoordinatorInterface(coordinator);
        reserveToken = FactoryTokenInterface(coord.getContract("ZAP_TOKEN"));
        bondage = BondageInterface(coord.getContract("BONDAGE"));
        //always allow bondage to transfer from wallet
        reserveToken.approve(bondage, ~uint256(0));
        tokenFactory = TokenFactoryInterface(factory);

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY"));
        registry.initiateProvider(providerPubKey, providerTitle);
        status = ContestStatus.Uninitialized;
    }

// contest lifecycle

    function initializeContest(
        address oracleAddress,
        uint256 _ttl
    ) onlyOwner public {
        require( status == ContestStatus.Uninitialized, "Contest already initialized");
        oracle = oracleAddress;
        ttl = _ttl + block.number;
        status = ContestStatus.Initialized;
        emit Initialized(oracle);
    }

/// TokenDotFactory methods

    function initializeCurve(
        bytes32 endpoint,
        bytes32 symbol,
        int256[] curve
    ) public returns(address) {
        // require(status==ContestStatus.Initialized,"Contest is not initalized")
        require(curves[endpoint] == 0, "Curve endpoint already exists or used in the past. Please choose a new endpoint");

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY"));
        registry.initiateProviderCurve(endpoint, curve, address(this));

        curves[endpoint] = newToken(bytes32ToString(endpoint), bytes32ToString(symbol));
        curves_list.push(endpoint);
        registry.setProviderParameter(endpoint, toBytes(curves[endpoint]));

        DotTokenCreated(curves[endpoint]);
        return curves[endpoint];
    }

    //whether this contract holds tokens or coming from msg.sender,etc
    function bond(bytes32 endpoint, uint numDots) public  {
        require( status == ContestStatus.Initialized, " contest is not initiated");

        uint256 issued = bondage.getDotsIssued(address(this), endpoint);

        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint256 numReserve = cost._costOfNDots(address(this), endpoint, issued + 1, numDots - 1);

        require(
            reserveToken.transferFrom(msg.sender, address(this), numReserve),
            "insufficient accepted token numDots approved for transfer"
        );

        reserveToken.approve(address(bondage), numReserve);
        bondage.bond(address(this), endpoint, numDots);
        FactoryTokenInterface(curves[endpoint]).mint(msg.sender, numDots);
        redeemed[msg.sender]=numReserve;
        emit Bonded(endpoint, numDots, msg.sender);
    }

    function unbond(bytes32 endpoint) public returns(uint256) {
        uint tokensBalance;

        if( status == ContestStatus.Expired) {
            //this mean settle has been called and already unbond to all endpoints

            //burn dot backed token
            tokensBalance = curveToken.balanceOf(msg.sender);
            curveToken.burnFrom(msg.sender, tokensBalance);

            // transfer back to user what they paid
            uint256 redeemAmount = redeemed[msg.sender];
            if(redeemAmount>0){
              require(reserveToken.transfer(msg.sender, reserveCost), "transfer failed");
              emit Unbonded(endpoint, reserveCost, msg.sender);
            }
            return redeemAmount;
        }
        else {
          //not expired and Settled has been called, winners can unbond

            require( status == ContestStatus.Settled, " contest not settled");
            require(winner==endpoint, "only winners can unbond for rewards");

            FactoryTokenInterface curveToken = FactoryTokenInterface(curves[winner]);
            tokensBalance = curveToken.balanceOf(msg.sender);
            require(tokensBalance>0, "Unsufficient balance to redeem");

            currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
            uint issued = bondage.getDotsIssued(address(this), winner);


            //get reserve value to send
            uint reserveCost = currentCost._costOfNDots(address(this), winner, issued + 1 - tokensBalance, tokensBalance - 1);

            //reward user's winning tokens unbond value + share of losing curves reserve token proportional to winning token holdings
            uint reward = ( winValue * FactoryTokenInterface(getTokenAddress(winner)).balanceOf(msg.sender) ) + reserveCost;

            //burn user's unbonded tokens
            // curveToken.approve(address(this),numDots); TODO ??
            curveToken.burnFrom(msg.sender, tokensBalance);

            reserveToken.transfer(msg.sender, reward);

            return reward;
        }
    }

    function newToken(
        string name,
        string symbol
    )
        internal
        returns (address tokenAddress)
    {
        FactoryTokenInterface token = tokenFactory.create(name, symbol);
        tokenAddress = address(token);
        return tokenAddress;
    }


    function judge(bytes32 endpoint) {

        require(status!=ContestStatus.Expired, "Contest is already in Expired state, ready to unbond");

        if(block.number > ttl ){ //expired
            status=ContestStatus.Expired;
            emit Expired(endpoint,ttl);
        }
        else{
          require( status == ContestStatus.Initialized, "Contest not initialized" );
          require( msg.sender == oracle, "Only designated Oracle can judge");
          winner = endpoint;
          status = ContestStatus.Judged;
          emit Judged(winner);
        }
    }


    function settle() public {
        if(status == ContestStatus.Expired){
          for(uint256 i = 0; i<curves_list.length; i++){
            //unbond all the endpoints
            uint256 numDots = bondage.getDotsIssued(address(this), curves_list[i]);
            if(numDots>0){
              bondage.unbond(address(this), curves_list[i], numDots);
            }
            emit Expired(curves_list[i],numDots);
          }
        }
        else{
          require( status == ContestStatus.Judged, "winner not determined");
          // how many winning dots
          uint256 numWin =  bondage.getDotsIssued(address(this), winner);
          // redeemable value of each dot token
          uint256 dots;
          for( uint256 i = 0; i < curves_list.length; i++) {
            dots =  bondage.getDotsIssued(address(this), curves_list[i]);
            if( dots > 0) {
                bondage.unbond(address(this), curves_list[i], dots);
            }
          }
          winValue = reserveToken.balanceOf(address(this)) / numWin;

          status = ContestStatus.Settled;
          emit Settled(winValue, numWin);
        }
    }


    //TODO ensure all has been redeemed or enough time has elasped
    function reset() public {
        require(msg.sender == oracle);
        //todo balance is 0
        require(status == ContestStatus.Settled || status == ContestStatus.Expired, "contest not settled");
        if( status == ContestStatus.Expired ) {
            require(reserveToken.balanceOf(address(this)) == 0, "funds remain");
        }

        delete redeemed_list;
        delete curves_list;
        status = ContestStatus.Initialized;
        emit Reset();
    }

/// GETTERS
    function getTokenAddress(bytes32 endpoint) public view returns(address) {
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY"));
        return bytesToAddr(registry.getProviderParameter(address(this), endpoint));
    }

    function getEndpoints() public view returns(bytes32[]){
      return curves_list;
    }

    function getStatus() public view returns(uint256){
      return uint(status);
    }

    function isEndpointValid(bytes32 _endpoint) public view returns(bool){
      for(uint256 i=0; i<curves_list.length;i++){
        if(_endpoint == curves_list[i]){
          return true;
        }
      }
      return false;
    }

    // https://ethereum.stackexchange.com/questions/884/how-to-convert-an-address-to-bytes-in-solidity
    function toBytes(address x) public pure returns (bytes b) {
        b = new bytes(20);
        for (uint i = 0; i < 20; i++)
            b[i] = byte(uint8(uint(x) / (2**(8*(19 - i)))));
    }

    //https://ethereum.stackexchange.com/questions/2519/how-to-convert-a-bytes32-to-string
    function bytes32ToString(bytes32 x) public pure returns (string) {
        bytes memory bytesString = new bytes(32);
        bytesString = abi.encodePacked(x);
        return string(bytesString);
    }

    //https://ethereum.stackexchange.com/questions/15350/how-to-convert-an-bytes-to-address-in-solidity
    function bytesToAddr (bytes b) public pure returns (address) {
        uint result = 0;
        for (uint i = b.length-1; i+1 > 0; i--) {
            uint c = uint(b[i]);
            uint to_inc = c * ( 16 ** ((b.length - i-1) * 2));
            result += to_inc;
        }
        return address(result);
    }
}
