import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./ERCDotFactory.sol";

contract TokenAdapter is ERCDotFactory{

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    FactoryToken acceptedToken;
    
    uint adapterRate;

    constructor(address coordinator, address _acceptedToken)
    ERCDotFactory(coordinator) {
        acceptedToken = FactoryToken(_acceptedToken);
    }

    function setAdapterRate(uint rate) internal {
        //children must set this
        adapterRate = rate;
    } 

    function ownerBond(address wallet, bytes32 specifier, uint quantity) payable onlyOwner {
        bond(wallet, specifier, quantity);
    }

    function ownerUnbond(address wallet, bytes32 specifier, uint quantity) onlyOwner {
        unbond(wallet, specifier, quantity);
    }

    // TODO: How to get accepted tokens?
    function bond(address wallet, bytes32 specifier, uint quantity) internal {
        
        require(
            acceptedToken.transferFrom( msg.sender, address(this), getAdapterPrice(specifier, quantity)), 
            "insufficient accepted token quantity approved for transfer"
        );

        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint reserveCost = bondage.calcZapForDots(address(this), specifier, quantity);
        if(reserveToken.balanceOf(this) < reserveCost ) {
            revert("EthAdapter does not hold enough reserve for bond");
        }
        
        if(msg.value < getAdapterPrice(specifier, quantity)){
            revert("Not enough tokens approved for requested number of dots");     
        }

        super.bond(wallet, specifier, quantity);
    }

    function unbond(address wallet, bytes32 specifier, uint quantity) internal {
         
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST")); 
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - quantity, quantity - 1);
        super.unbond(wallet, specifier, quantity); 

        FactoryToken tok = FactoryToken(acceptedToken);
        require(tok.transfer(wallet, reserveCost * adapterRate), "Error: Transfer failed");
    } 

    function getAdapterPrice(bytes32 specifier, uint quantity) view returns(uint){
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint reserveAmount = bondage.calcZapForDots(address(this), specifier, quantity);
        return reserveAmount * adapterRate;
    }

}
