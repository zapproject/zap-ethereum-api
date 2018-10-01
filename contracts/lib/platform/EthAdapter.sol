import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./ERCDotFactory.sol";

contract EthAdapter is ERCDotFactory {

    CurrentCostInterface public currentCost;
    RegistryInterface public registry;
    BondageInterface public bondage;
    
    uint public adapterRate;

    event MsgSender(address _sender);

    constructor(address coordinator, address tokenFactory, uint256 rate)
    ERCDotFactory(coordinator, tokenFactory) {
        adapterRate = rate;
    }

    function setAdapterRate(uint rate) internal {
        //children must set this
        adapterRate = rate;
    } 

    function ownerBond(address wallet, bytes32 specifier, uint numDots) payable onlyOwner {
        emit MsgSender(msg.sender);
        bond(wallet, specifier, numDots);
    }


    function ownerUnbond(address wallet, bytes32 specifier, uint quantity) onlyOwner {
        unbond(wallet, specifier, quantity);
    }

    //Override
    function bond(address wallet, bytes32 specifier, uint quantity) internal {

        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint256 issued = bondage.getDotsIssued(address(this), specifier);

        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint256 numReserve = cost._costOfNDots(address(this), specifier, issued + 1, quantity - 1);

        if(msg.value < getAdapterPrice(specifier, quantity)){
            revert("Not enough eth sent for requested number of dots");     
        }

        reserveToken.approve(address(bondage), numReserve);
        bondage.bond(address(this), specifier, quantity);

        FactoryTokenInterface(curves[specifier]).mint(wallet, quantity);

    }

    //Override
    function unbond(address wallet, bytes32 specifier, uint quantity) internal {
         
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST")); 
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - quantity, quantity - 1);
        FactoryTokenInterface tok = FactoryTokenInterface(curves[specifier]);

        //unbond dots
        bondage.unbond(address(this), specifier, quantity);
        //burn dot backed token
        tok.burnFrom(wallet, quantity);
        //send wallet eth
        wallet.transfer(reserveCost * adapterRate);
    } 

    function getAdapterPrice(bytes32 specifier, uint quantity) view returns(uint){
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint reserveAmount = bondage.calcZapForDots(address(this), specifier, quantity);
        return reserveAmount * adapterRate;
    }

}
