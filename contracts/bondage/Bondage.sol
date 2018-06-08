pragma solidity ^0.4.24;
// v1.0

import "../lib/Destructible.sol";
import "../lib/ERC20.sol";
import "./currentCost/CurrentCostInterface.sol";
import "./BondageStorage.sol";

contract Bondage is Destructible {

    event Bound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numZap);
    event Unbound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Escrowed(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Released(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);

    event TEST_EVENT(uint256 val);

    BondageStorage stor;
    CurrentCostInterface currentCost;
    ERC20 token;
    uint256 decimals = 10 ** 18;

    address public storageAddress;
    address public arbiterAddress;
    address public dispatchAddress;

    // For restricting dot escrow/transfer method calls to Dispatch and Arbiter
    modifier operatorOnly {
        if (msg.sender == arbiterAddress || msg.sender == dispatchAddress)
            _;
    }

    /// @dev Initialize Storage, Token, anc CurrentCost Contracts
    constructor(address _storageAddress, address _tokenAddress, address _currentCostAddress) public {
        stor = BondageStorage(_storageAddress);
        token = ERC20(_tokenAddress); 
        currentCost = CurrentCostInterface(_currentCostAddress);
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
    function bond(address oracleAddress, bytes32 endpoint, uint256 numZap) external returns (uint256 bound) {
        bound = _bond(msg.sender, oracleAddress, endpoint, numZap);
        emit Bound(msg.sender, oracleAddress, endpoint, numZap);
    }

    /// @return total ZAP unbound from oracle
    function unbond(address oracleAddress, bytes32 endpoint, uint256 numDots) external returns (uint256 unbound) {
        unbound = _unbond(msg.sender, oracleAddress, endpoint, numDots);
        emit Unbound(msg.sender, oracleAddress, endpoint, numDots);
    }        

    /// @dev will bond to an oracle on behalf of some holder
    /// @return total ZAP bound to oracle
    function delegateBond(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numZap) external returns (uint256 bound) {
            
        emit TEST_EVENT(1);
        require(stor.getDelegate(holderAddress, oracleAddress) == 0x0);
        emit TEST_EVENT(2);
        stor.setDelegate(holderAddress, oracleAddress, msg.sender);
        bound = _bond(holderAddress, oracleAddress, endpoint, numZap);
        emit Bound(holderAddress, oracleAddress, endpoint, numZap);
    }

    /// @return total ZAP unbound from oracle
    function delegateUnbond(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots) external returns (uint256 unbound) {
        require(stor.getDelegate(holderAddress, oracleAddress) == msg.sender);
        unbound = _unbond(holderAddress, oracleAddress, endpoint, numDots);
        emit Unbound(holderAddress, oracleAddress, endpoint, numDots);
    }

    /// @dev will reset delegate 
    function resetDelegate(address oracleAddress) external {
        stor.deleteDelegate(msg.sender, oracleAddress);
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
        for (uint256 i = 0; i < numDots; i++) {
            numZap += currentCostOfDot(                
                oracleAddress,
                endpoint,
                getDotsIssued(oracleAddress, endpoint) + i
            );
        }
        return numZap;
    }

    /// @dev Calculate amount of dots which could be purchased with given (numZap) ZAP tokens (max is 1000)
    /// for endpoint specified by endpoint and data-provider address specified by oracleAddress
    function calcBondRate(
        address oracleAddress,
        bytes32 endpoint,
        uint256 numZap
    )
        public
        view
        returns (uint256 maxNumZap, uint256 numDots) 
    {
        uint256 infinity = decimals;
        uint256 dotCost;
        if (numZap > 1000) numZap = 1000;
        if (numZap==0) return (0,0);
        for (numDots; numDots < infinity; numDots++) {
            dotCost = currentCostOfDot(
                oracleAddress,
                endpoint,
                getDotsIssued(oracleAddress, endpoint) + numDots
            );

            if (numZap >= dotCost) {
                numZap -= dotCost;
                maxNumZap += dotCost;
            } else {
                break;
            }
        }
        return (maxNumZap, numDots);
    }

    /// @dev Get the current cost of a dot.
    /// @param endpoint specifier
    /// @param oracleAddress data-provider
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
        uint256 numZap        
    )
        private
        returns (uint256 numDots) 
    {   
        // This also checks if oracle is registered w/an initialized curve
        (numZap, numDots) = calcBondRate(oracleAddress, endpoint, numZap);

        if (!stor.isProviderInitialized(holderAddress, oracleAddress)) {            
            stor.setProviderInitialized(holderAddress, oracleAddress);
            stor.addHolderOracle(holderAddress, oracleAddress);
        }

        // User must have approved contract to transfer working ZAP
        require(token.transferFrom(msg.sender, this, numZap * decimals));

        stor.updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "add");        
        stor.updateTotalIssued(oracleAddress, endpoint, numDots, "add");
        stor.updateTotalBound(oracleAddress, endpoint, numZap, "add");

        return numDots;
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
        //currentDots
        uint256 bondValue = stor.getBondValue(holderAddress, oracleAddress, endpoint);
        if (bondValue >= numDots && numDots > 0) {

            uint256 subTotal = 1;
            uint256 dotsIssued;

            for (subTotal; subTotal < numDots; subTotal++) {

                dotsIssued = getDotsIssued(oracleAddress, endpoint) - subTotal;

                numZap += currentCostOfDot(
                    oracleAddress,
                    endpoint,
                    dotsIssued
                ); 
            }    
            stor.updateTotalBound(oracleAddress, endpoint, numZap, "sub");
            stor.updateTotalIssued(oracleAddress, endpoint, numDots, "sub");
            stor.updateBondValue(holderAddress, oracleAddress, endpoint, subTotal, "sub");

            if(token.transfer(holderAddress, numZap * decimals))
                return numZap;
        }
        return 0;
    }

}
