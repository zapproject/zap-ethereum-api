import "../../platform/bondage/currentCost/CurrentCostInterface.sol";
import "./ERCDotFactory.sol";

contract TokenAdapter is ERCDotFactory {

    CurrentCostInterface currentCost;
    RegistryInterface registry;
    BondageInterface bondage;
    FactoryTokenInterface acceptedToken;
    
    uint adapterRate;

    constructor(address coordinator, address tokenFactory, FactoryTokenInterface _acceptedToken)
    ERCDotFactory(coordinator, tokenFactory) {
        acceptedToken = _acceptedToken;
    }

    function setAdapterRate(uint rate) public onlyOwner {
        //children must set this
        adapterRate = rate;
    } 

    function ownerBond(address wallet, bytes32 specifier, uint quantity) public onlyOwner {
        bond(wallet, specifier, quantity);
    }

    function ownerUnbond(address wallet, bytes32 specifier, uint quantity) public onlyOwner {
        unbond(wallet, specifier, quantity);
    }

    //Override
    function bond(address wallet, bytes32 specifier, uint quantity) internal {
        require(
            acceptedToken.transferFrom(wallet, address(this), getAdapterPrice(specifier, quantity)),
            "insufficient accepted token quantity approved for transfer"
        );

        uint256 issued = bondage.getDotsIssued(address(this), specifier);

        CurrentCostInterface cost = CurrentCostInterface(coord.getContract("CURRENT_COST"));
        uint256 numReserve = cost._costOfNDots(address(this), specifier, issued + 1, quantity - 1);

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


        //unbond dots
        bondage.unbond(address(this), specifier, quantity);
        //burn dot backed token
        FactoryTokenInterface curveToken = FactoryTokenInterface(curves[specifier]);
        curveToken.burnFrom(wallet, quantity);

        require(acceptedToken.transfer(wallet, reserveCost * adapterRate), "Error: Transfer failed");
    }

    function getAdapterPrice(bytes32 specifier, uint quantity) view returns(uint){
        bondage = BondageInterface(coord.getContract("BONDAGE")); 
        uint reserveAmount = bondage.calcZapForDots(address(this), specifier, quantity);
        return reserveAmount * adapterRate;
    }
}
