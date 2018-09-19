import "./ERCDotFactory.sol";

contract TokenAdapter is ERCDotFactory{

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    
    uint adapterRate;
    address acceptedToken;

    constructor(address coordinator, address _acceptedToken)
    EthAdapter(coordinator) {
        acceptedToken = _acceptedToken;
    }

    function setAdapterRate(int rate) internal {
        //children must set this
        adapterRate = rate;
    } 

    function bond(address wallet, bytes32 specifier, uint numDots) ownerOnly {
        bond(wallet, specifier, numDots);
    }

    function unbond(address wallet, bytes32 specifier, uint numDots) ownerOnly {
        unbond(wallet, specifier, numDots);
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
        require(tok.transfer(wallet, reserveCost * adapterRate), "Error: Transfer failed");
    } 

    function getAdapterPrice(bytes32 specifier, uint numDots) view returns(uint){
        Bondage bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint memory reserveAmount = bondage.calcZapForDots(address(this), positions[posIndex].specifier, numDots);
        return reserveAmount * adapterRate;
    }

}
