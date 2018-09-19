import "../lib/ownership/Ownable.sol";
import "../lib/ownership/ZapCoordinatorInterface.sol";
import "../../platform/bondage/BondageInterface.sol";
import "../../platform/registry/RegistryInterface.sol";
import "../lib/token/Token.sol";

contract TokenAdapter is ERCDotFactory, Ownable{

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    
    uint reserveRate;
    address acceptedToken;

    constructor(address coordinator, address token){
        
        ERCDotFactory(coordinator);
        acceptedToken = token;
    }

    function setAdapterRate(int rate) internal {
        //children must set this
        reserveRate = rate;
    } 

    function bond(address wallet, bytes32 specifier, uint numDots) internal {
        
        require(
            acceptedToken.transferFrom( msg.sender, getPrice(specifier, numDots), 
            "insufficient accepted token quantity approved for transfer"
        );

        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint memory reserveCost = bondage.calcZapForDots(address(this), specifier, numDots);
        if(reserveToken.balanceOf(this) < reserveCost ) {
            revert("EthAdapter does not hold enough reserve for bond");
        }
        
        if(msg.value < getAdapterPrice(specifier, numDots)){
            revert("Not enough tokens approved for requested number of dots");     
        }

        super.bond(wallet, specifier, numDots);
    }

    function unbond(address wallet, bytes32 specifier, uint numDots) internal {
         
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint issued = bondage.getDotsIssued(address(this), specifier);

        currentCost = CurrentCostInterface(coord.getContract("CURRENT_COST")); 
        uint reserveCost = currentCost._costOfNDots(address(this), specifier, issued + 1 - numDots, numDots - 1);
        super.unbond(wallet, specifier, quantity); 

        Token tok = Token(acceptedToken);
        require(tok.transfer(wallet, reserveCost * reserveRate), "Error: Transfer failed");
    } 

    function getAdapterPrice(bytes32 specifier, uint numDots) view returns(uint){
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint memory reserveAmount = bondage.calcZapForDots(address(this), positions[posIndex].specifier, numDots);
        return reserveAmount * reserveRate;
    }

}
