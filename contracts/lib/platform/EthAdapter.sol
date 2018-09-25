import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./ERCDotFactory.sol";

contract EthAdapter is ERCDotFactory {

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    
    uint adapterRate;

    constructor( address coordinator, uint256 rate)
    ERCDotFactory(coordinator) {
        adapterRate = rate;
    }

    function setAdapterRate(uint rate) internal {
        //children must set this
        adapterRate = rate;
    } 

    function ownerBond(address wallet, bytes32 specifier, uint numDots) payable onlyOwner {
        bond(wallet, specifier, numDots);
    }


    function ownerUnbond(address wallet, bytes32 specifier, uint quantity) onlyOwner {
        unbond(wallet, specifier, quantity);
    }

    function bond(address wallet, bytes32 specifier, uint quantity) internal {

        // TODO: check tokens balance, but transfer tokens from wallet after this check
        bondage = BondageInterface(coord.getContract("BONDAGE"));
        uint reserveCost = bondage.calcZapForDots(address(this), specifier, quantity);
        if(reserveToken.balanceOf(this) < reserveCost ) {
            revert("EthAdapter does not hold enough reserve for bond");
        }
        
        if(msg.value < getAdapterPrice(specifier, quantity)){
            revert("Not enough eth sent for requested number of dots");     
        }
        super.bond(wallet, specifier, quantity);
    }

    function unbond(address wallet, bytes32 specifier, uint quantity) internal {
         
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST")); 
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - quantity, quantity - 1);
        FactoryToken tok = FactoryToken(curves[specifier]);

        super.unbond(wallet, specifier, quantity);
       // wallet.transfer(reserveCost * adapterRate);
    } 

    function getAdapterPrice(bytes32 specifier, uint quantity) view returns(uint){
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint reserveAmount = bondage.calcZapForDots(address(this), specifier, quantity);
        return reserveAmount * adapterRate;
    }

}
