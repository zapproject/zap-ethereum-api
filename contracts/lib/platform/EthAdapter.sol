import "../lib/ownership/Ownable.sol";
import "../lib/ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../lib/token/Token.sol";

contract EthAdapter is ERCDotFactory, Ownable{

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    
    uint reserveRate;

    function setAdapterRate(int rate) internal {
        //children must set this
        reserveRate = rate;
    } 

    //cannot overload bond because payable extends signature
    function bond(address wallet, bytes32 specifier, uint numDots) internal {

        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint memory reserveCost = bondage.calcZapForDots(address(this), specifier, numDots);
        if(reserveToken.balanceOf(this) < reserveCost ) {
            revert("EthAdapter does not hold enough reserve for bond");
        }
        
        if(msg.value < getAdapterPrice(specifier, numDots)){
            revert("Not enough eth sent for requested number of dots");     
        }

        super.bond(wallet, specifier, numDots);
    }

    function unbond(address wallet, bytes32 specifier, uint numDots) internal {
         
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST")); 
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - numDots, numDots - 1);
        Token tok = Token(curves[specifier]);

        super.unbond(wallet, specifier, quantity); 
        wallet.send(reserveCost * reserveRate);
    } 

    function getAdapterPrice(bytes32 specifier, uint numDots) view returns(uint){
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint memory reserveAmount = bondage.calcZapForDots(address(this), positions[posIndex].specifier, numDots);
        return reserveAmount * reserveRate;
    }

}
