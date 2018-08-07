pragma solidity ^0.4.24;

import "../../lib/lifecycle/Destructible.sol";
import "../../lib/ownership/Upgradable.sol";
import "../../lib/ownership/StorageHandler.sol";
import "../../lib/ERC20.sol";
import "./currentCost/CurrentCostInterface.sol";
import "./BondageStorage.sol";
import "./BondageInterface.sol";

contract Bondage is Destructible, BondageInterface, StorageHandler, Upgradable {

    event Bound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numZap, uint256 numDots);
    event Unbound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Escrowed(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Released(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);

    address storageAddress;
    BondageStorage stor;
    CurrentCostInterface currentCost;
    ERC20 token;
    uint256 decimals = 10 ** 18;

    address public arbiterAddress;
    address public dispatchAddress;

    // For restricting dot escrow/transfer method calls to Dispatch and Arbiter
    modifier operatorOnly {
        if (msg.sender == arbiterAddress || msg.sender == dispatchAddress)
        _;
    }

    /// @dev Initialize Storage, Token, anc CurrentCost Contracts
    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() private {
        storageAddress = coordinator.getContract("BONDAGE_STORAGE");
        stor = BondageStorage(storageAddress);
        token = ERC20(coordinator.getContract("ZAP_TOKEN")); 
        currentCost = CurrentCostInterface(coordinator.getContract("CURRENT_COST")); 
    }

    /// @dev Set Arbiter address
    /// @notice This needs to be called upon deployment and after Arbiter update
    function setArbiterAddress(address _arbiterAddress) external onlyOwner {
        arbiterAddress = _arbiterAddress;
    }
    
    /// @dev Set Dispatch address
    /// @notice This needs to be called upon deployment and after Dispatch update
    function setDispatchAddress(address _dispatchAddress) external onlyOwner {
        dispatchAddress = _dispatchAddress;
    }

    /// @notice Upgdate currentCostOfDot function (barring no interface change)
    function setCurrentCostAddress(address currentCostAddress) public onlyOwner {
        currentCost = CurrentCostInterface(currentCostAddress);
    }

    /// @dev will bond to an oracle
    /// @return total ZAP bound to oracle
    function bond(address oracleAddress, bytes32 endpoint, uint256 numDots) external returns (uint256 bound) {
        bound = _bond(msg.sender, oracleAddress, endpoint, numDots);
        emit Bound(msg.sender, oracleAddress, endpoint, bound, numDots);
    }

    /// @return total ZAP unbound from oracle
    function unbond(address oracleAddress, bytes32 endpoint, uint256 numDots) external returns (uint256 unbound) {
        unbound = _unbond(msg.sender, oracleAddress, endpoint, numDots);
        emit Unbound(msg.sender, oracleAddress, endpoint, numDots);
    }        

    /// @dev will bond to an oracle on behalf of some holder
    /// @return total ZAP bound to oracle
    function delegateBond(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots) external returns (uint256 boundZap) {
        boundZap = _bond(holderAddress, oracleAddress, endpoint, numDots);
        emit Bound(holderAddress, oracleAddress, endpoint, boundZap, numDots);
    }

    /// @dev Move numDots dots from provider-requester to bondage according to 
    /// data-provider address, holder address, and endpoint specifier (ala 'smart_contract')
    /// Called only by Disptach or Arbiter Contracts
    function escrowDots(        
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots
        )
    external
    operatorOnly        
    returns (bool success)
    {
        uint256 currentDots = getBoundDots(holderAddress, oracleAddress, endpoint);
        uint256 dotsToEscrow = numDots;
        if (numDots > currentDots) dotsToEscrow = currentDots; 
        stor.updateBondValue(holderAddress, oracleAddress, endpoint, dotsToEscrow, "sub");
        stor.updateEscrow(holderAddress, oracleAddress, endpoint, dotsToEscrow, "add");
        emit Escrowed(holderAddress, oracleAddress, endpoint, dotsToEscrow);
        return true;
    }

    /// @dev Transfer N dots from fromAddress to destAddress. 
    /// Called only by Disptach or Arbiter Contracts
    /// In smart contract endpoint, occurs per satisfied request. 
    /// In socket endpoint called on termination of subscription.
    function releaseDots(
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots
        )
    external
    operatorOnly 
    returns (bool success)
    {
        uint256 numEscrowed = stor.getNumEscrow(holderAddress, oracleAddress, endpoint);
        uint256 dotsToEscrow = numDots;
        if (numDots > numEscrowed) dotsToEscrow = numEscrowed;
        stor.updateEscrow(holderAddress, oracleAddress, endpoint, dotsToEscrow, "sub");
        stor.updateBondValue(oracleAddress, oracleAddress, endpoint, dotsToEscrow, "add");
        emit Released(holderAddress, oracleAddress, endpoint, dotsToEscrow);
        return true;
    }

    /// @dev Calculate quantity of tokens required for specified amount of dots
    /// for endpoint defined by endpoint and data provider defined by oracleAddress
    function calcZapForDots(
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots       
        ) 
    external
    view
    returns (uint256 numZap)
    {
        uint256 issued = getDotsIssued(oracleAddress, endpoint);
        return currentCost._costOfNDots(oracleAddress, endpoint, issued + 1, numDots - 1);
    }

    /// @dev Get the current cost of a dot.
    /// @param endpoint specifier
    /// @param oracleAddress data-provider
    /// @param totalBound current number of dots
    function currentCostOfDot(
        address oracleAddress,
        bytes32 endpoint,
        uint256 totalBound
        )
    public
    view
    returns (uint256 cost)
    {
        return currentCost._currentCostOfDot(oracleAddress, endpoint, totalBound);
    }

    /// @dev Get issuance limit of dots 
    /// @param endpoint specifier
    /// @param oracleAddress data-provider
    function dotLimit(
        address oracleAddress,
        bytes32 endpoint
        )
    public
    view
    returns (uint256 limit)
    {
        return currentCost._dotLimit(oracleAddress, endpoint);
    }



    function getDotsIssued(
        address oracleAddress,
        bytes32 endpoint        
        )        
    public
    view
    returns (uint256 dots)
    {
        return stor.getDotsIssued(oracleAddress, endpoint);
    }

    function getBoundDots(        
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint
        )
    public
    view        
    returns (uint256 dots)
    {
        return stor.getBoundDots(holderAddress, oracleAddress, endpoint);
    }

    /// @return total ZAP held by contract
    function getZapBound(address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return stor.getNumZap(oracleAddress, endpoint);
    }

    function _bond(
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots        
        )
    private
    returns (uint256) 
    {   
        // This also checks if oracle is registered w/an initialized curve
        uint256 issued = getDotsIssued(oracleAddress, endpoint);
        require(issued + numDots <= dotLimit(oracleAddress, endpoint));
        
        uint256 numZap = currentCost._costOfNDots(oracleAddress, endpoint, issued + 1, numDots - 1);

        // User must have approved contract to transfer working ZAP
        require(token.transferFrom(msg.sender, this, numZap));

        if (!stor.isProviderInitialized(holderAddress, oracleAddress)) {            
            stor.setProviderInitialized(holderAddress, oracleAddress);
            stor.addHolderOracle(holderAddress, oracleAddress);
        }

        stor.updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "add");        
        stor.updateTotalIssued(oracleAddress, endpoint, numDots, "add");
        stor.updateTotalBound(oracleAddress, endpoint, numZap, "add");

        return numZap;
    }

    function _unbond(        
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots
        )
    private
    returns (uint256 numZap)
    {
        // Make sure the user has enough to bond with some additional sanity checks
        uint256 amountBound = stor.getBondValue(holderAddress, oracleAddress, endpoint);
        require(amountBound >= numDots);
        require(numDots > 0);

        // Get the value of the dots
        uint256 issued = getDotsIssued(oracleAddress, endpoint);
        numZap = currentCost._costOfNDots(oracleAddress, endpoint, issued + 1 - numDots, numDots - 1);

        // Update the storage values
        stor.updateTotalBound(oracleAddress, endpoint, numZap, "sub");
        stor.updateTotalIssued(oracleAddress, endpoint, numDots, "sub");
        stor.updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "sub");

        // Do the transfer
        require(token.transfer(holderAddress, numZap));

        return numZap;
    }

}