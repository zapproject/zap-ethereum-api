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

contract SampleContesty is Ownable {

    CurrentCostInterface currentCost;
    FactoryTokenInterface public reserveToken;
    ZapCoordinatorInterface public coord;
    TokenFactoryInterface public tokenFactory;
    BondageInterface bondage;

    enum ContestStatus { 
        Uninitialized,    //  
        Initialized,      // ready for buys
        ReadyToSettle,    // ready for judgement 
        Judged,           // winner determined 
        Settled           // value of winning tokens determined 
    }

    address public oracle;    // address of oracle who will choose the winner
    bytes32 public winner;    // curve identifier of the winner 
    uint256 public winValue;  // final value of the winning token
    ContestStatus public status; //state of contest

    mapping(bytes32 => address) public curves; // map of endpoint specifier to token-backed dotaddress
    bytes32[] public curves_list; // array of endpoint specifiers

    mapping(address => uint8) public redeemed; // map of address redemption state
    address[] public redeemed_list;
    
    event DotTokenCreated(address tokenAddress);
    event Bonded(bytes32 indexed endpoint, uint256 indexed numDots, address indexed sender); 
    event Unbonded(bytes32 indexed endpoint, uint256 indexed numDots, address indexed sender); 

    //TODO ensure all has been redeemed or enough time has elasped 
    function reset() public {
        require(status == ContestStatus.Settled, "contest not settled");
        require(msg.sender == oracle);
        
        delete redeemed_list;
        delete curves_list;
        status = ContestStatus.Initialized; 
    }

    constructor(
        address coordinator, 
        address factory,
        uint256 providerPubKey,
        bytes32 providerTitle 
    ){
        coord = ZapCoordinatorInterface(coordinator); 
        reserveToken = FactoryTokenInterface(coord.getContract("ZAP_TOKEN"));
        //always allow bondage to transfer from wallet
        reserveToken.approve(coord.getContract("BONDAGE"), ~uint256(0));
        tokenFactory = TokenFactoryInterface(factory);

        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        registry.initiateProvider(providerPubKey, providerTitle);
        status = ContestStatus.Uninitialized;
    }

// contest lifecycle

    function initializeContest(
        address oracleAddress
    ) onlyOwner public {
        require( status == ContestStatus.Uninitialized, "Contest already initialized");
        oracle = oracleAddress;
        status = ContestStatus.Initialized;
    }

    function close() onlyOwner {
       status = ContestStatus.ReadyToSettle; 
    }

    function judge(bytes32 endpoint) {
        require( status == ContestStatus.ReadyToSettle, "not closed" );
        require( msg.sender == oracle, "not oracle");
        winner = endpoint;
        status = ContestStatus.Judged;
    }

    function settle() {
        require( status == ContestStatus.Judged, "winner not determined");

        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint256 dots;
        for( uint256 i = 0; i < curves_list.length; i++) {

            if(curves_list[i] != winner) {
                dots =  bondage.getDotsIssued(address(this), curves_list[i]);  
                bondage.unbond(address(this), curves_list[i], dots);                 
            }
        } 

        // how many winning dots    
        uint256 numWin =  bondage.getDotsIssued(address(this), winner);  
        // redeemable value of each dot token
        winValue = reserveToken.balanceOf(address(this)) / numWin;
        status = ContestStatus.Settled;
    }

    function redeem() {
        require(status == ContestStatus.Settled, "contest not settled");        
        require(redeemed[msg.sender] == 0, "already redeeemed");
        
        uint reward = winValue * FactoryTokenInterface(getTokenAddress(winner)).balanceOf(msg.sender);
        FactoryTokenInterface(getTokenAddress(winner)).transfer(msg.sender, reward);
        redeemed[msg.sender] = 1;
    }

/// TokenDotFactory methods

    function initializeCurve(
        bytes32 endpoint, 
        bytes32 symbol, 
        int256[] curve
    ) public returns(address) {
        
        require(curves[endpoint] == 0, "Curve endpoint already exists or used in the past. Please choose new");
        
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        require(registry.isProviderInitiated(address(this)), "Provider not intiialized");

        registry.initiateProviderCurve(endpoint, curve, address(this));
        curves[endpoint] = newToken(bytes32ToString(endpoint), bytes32ToString(symbol));
        
        registry.setProviderParameter(endpoint, toBytes(curves[endpoint]));
        
        DotTokenCreated(curves[endpoint]);
        return curves[endpoint];
    }

    //whether this contract holds tokens or coming from msg.sender,etc
    function bond(bytes32 endpoint, uint numDots) public  {

        require( status == ContestStatus.Initialized, " contest not live"); 

        bondage = BondageInterface(coord.getContract("BONDAGE"));
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
        Bonded(endpoint, numDots, msg.sender);

    }

    //whether this contract holds tokens or coming from msg.sender,etc
    function unbond(bytes32 endpoint, uint numDots) public {

        require( status == ContestStatus.Settled, " contest not settled"); 

        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint issued = bondage.getDotsIssued(address(this), endpoint);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint reserveCost = currentCost._costOfNDots(address(this), endpoint, issued + 1 - numDots, numDots - 1);

        //unbond dots
        bondage.unbond(address(this), endpoint, numDots);
        //burn dot backed token
        FactoryTokenInterface curveToken = FactoryTokenInterface(curves[endpoint]);
        curveToken.burnFrom(msg.sender, numDots);

        require(reserveToken.transfer(msg.sender, reserveCost), "Error: Transfer failed");
        Unbonded(endpoint, numDots, msg.sender);

    }

    function newToken(
        string name,
        string symbol
    ) 
        public
        returns (address tokenAddress) 
    {
        FactoryTokenInterface token = tokenFactory.create(name, symbol);
        tokenAddress = address(token);
        return tokenAddress;
    }

    function getTokenAddress(bytes32 endpoint) public view returns(address) {
        RegistryInterface registry = RegistryInterface(coord.getContract("REGISTRY")); 
        return bytesToAddr(registry.getProviderParameter(address(this), endpoint));
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
