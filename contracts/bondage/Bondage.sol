pragma solidity ^0.4.17;

//calcTok should be called calcDots?

// bond works right now bc commented out following issues
// RUNNING THROUGH ALL OF GAS in calcTok (see infinite for loop)
// require(token.transferFrom ...) reverting in _bond 
// require(curveType != RegistryInterface.CurveType.None) reverting in _currentCostOfDot (see CurrentCost.sol)
// ^^ this last issue only is a problem w/js tests, can get to run in truffle console.

// MAKE SURE TO CALL setArbiterAddress & setDispatchAddress UPON DEPLOYMENT

/* Test Case for truffle dev – 
owner = web3.eth.accounts[0]
haddr = web3.eth.accounts[1]
oaddr = web3.eth.accounts[2]

reg = Registry.at(Registry.address)
regStor = RegistryStorage.at(RegistryStorage.address)
regStor.transferOwnership(Registry.address)
spec = "test-line"
reg.initiateProvider(999,"ESPN News",spec,["Sport1","Sport2"],{from: oaddr})
reg.initiateProviderCurve(spec, 1, 1, 2, {from: oaddr})

bond = Bondage.at(Bondage.address)
bondStor = BondageStorage.at(BondageStorage.address)
bondStor.transferOwnership(Bondage.address)

token = TheToken.at(TheToken.address)
tokensForOwner = new web3.BigNumber("1500e18")
tokensForProvider = new web3.BigNumber("5000e18")
approveTokens = new web3.BigNumber("1000e18")
token.allocate(owner, tokensForOwner, { from: owner })
token.allocate(haddr, tokensForProvider, { from: owner })
token.approve(Bondage.address, approveTokens, {from: haddr})
*/

import "../aux/Mortal.sol";
import "../aux/ERC20.sol";
import "../aux/CurrentCostInterface.sol";
import "../registry/RegistryInterface.sol";
import "./BondageStorage.sol";

contract Bondage is Mortal {

    BondageStorage stor;
    RegistryInterface registry;
    ERC20 token;
    CurrentCostInterface currentCost;
    uint256 public decimals = 10 ** 18;

    address arbiterAddress;
    address dispatchAddress;

    // For restricting dot escrow/transfer method calls to Dispatch and Arbiter
    modifier operatorOnly {
        if (msg.sender == arbiterAddress || msg.sender == dispatchAddress)
            _;
    }

    /// @dev Initialize Token and Registry Contracts
    function Bondage(address storageAddress, address registryAddress, address tokenAddress, address currentCostAddress) public {
        stor = BondageStorage(storageAddress);
        token = ERC20(tokenAddress);
        setCurrentCostAddress(currentCostAddress);
        setRegistryAddress(registryAddress);
    }

    /// @notice Reinitialize registry instance after upgrade
    function setRegistryAddress(address registryAddress) public onlyOwner {
        registry = RegistryInterface(registryAddress);
    }

    /// @notice Upgrade currentCostOfDot function
    function setCurrentCostAddress(address currentCostAddress) public onlyOwner {
        currentCost = CurrentCostInterface(currentCostAddress);
    }

    /// @dev Set Arbiter address
    /// @notice This needs to be called upon deployment and after Arbiter upgrade
    function setArbiterAddress(address _arbiterAddress) public onlyOwner {
        arbiterAddress = _arbiterAddress;
    }
    
    /// @dev Set Dispatch address
    /// @notice This needs to be called upon deployment and after Dispatch upgrade
    function setDispatchAddress(address _dispatchAddress) public onlyOwner {
        dispatchAddress = _dispatchAddress;
    }

    /// @notice Will bond `numTok` to `registry.getProviderTitle(oracleAddress)`
    /// @return total TOK bound to oracle
    function bond(address oracleAddress, bytes32 specifier, uint256 numTok) public returns (uint256) {
        return _bond(msg.sender, oracleAddress, specifier, numTok);
    }

    /// @return total TOK unbound from oracle
    function unbond(address oracleAddress, bytes32 specifier, uint256 numDots) public returns (uint256) {
        return _unbond(msg.sender, oracleAddress, specifier, numDots);
    }

    /// @return total TOK held by contract
    function getTokBound(address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return stor.getNumTok(oracleAddress, endpoint);
    }

    /// @dev Move numDots dots from provider-requester to bondage according to 
    /// data-provider address, holder address, and endpoint specifier (ala 'smart_contract')
    function escrowDots(        
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots
    )
        public
        operatorOnly        
        returns (bool success)
    {

        uint256 currentDots = getDots(holderAddress, oracleAddress, specifier);
        if (currentDots >= numDots) {
            stor.updateBondValue(holderAddress, oracleAddress, specifier, numDots, "sub");
            stor.updateEscrow(holderAddress, oracleAddress, specifier, numDots, "add");
            return true;
        }
        return false;
    }

    /// @dev Transfer N dots from fromAddress to destAddress. 
    /// Called only by the DisptachContract or ArbiterContract.
    /// In smart contract endpoint, occurs per satisfied request. 
    /// In socket endpoint called on termination of subscription.
    function releaseDots(
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots
    )
        public 
        operatorOnly 
        returns (bool success)
    {
        if (numDots <= stor.getNumEscrow(holderAddress, oracleAddress, specifier)) {
            stor.updateEscrow(holderAddress, oracleAddress, specifier, numDots, "sub");
            initializeProvider(holderAddress, oracleAddress);
            stor.updateBondValue(holderAddress, oracleAddress, specifier, numDots, "add");
            return true;
        }
        return false;
    }

    /// @dev Calculate quantity of TOK token required for specified amount of dots
    /// for endpoint defined by specifier and data provider defined by oracleAddress
    function calcTokForDots(
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots
    ) 
        public
        view
        returns (uint256 numTok)
    {
        for (uint256 i = 0; i < numDots; i++) {
            numTok += currentCostOfDot(
                oracleAddress,
                specifier,
                getDotsIssued(oracleAddress, specifier) + i
            );
        }
        return numTok;
    }

    /// @dev Calculate amount of dots which could be purchased with given (numTok) TOK tokens 
    /// for endpoint specified by specifier and data-provider address specified by oracleAddress
    function calcTok(
        address oracleAddress,
        bytes32 specifier,
        uint256 numTok
    )
        public
        view
        returns (uint256 totalDotCost, uint256 numDots) 
    {
        uint256 infinity = decimals;
        uint256 dotCost = 0;

        for (numDots; numDots < 10/*infinity*/; numDots++) {
            dotCost = currentCostOfDot(
                oracleAddress,
                specifier,
                getDotsIssued(oracleAddress, specifier) + numDots
            );

            if (numTok >= dotCost) {
                numTok -= dotCost;
                totalDotCost += dotCost;
            } else {
                break;
            }
        }
        return (totalDotCost, numDots);
    }

    /// @dev Get the current cost of a dot.
    /// Endpoint specified by specifier.
    /// Data-provider specified by oracleAddress,
    function currentCostOfDot(
        address oracleAddress,
        bytes32 specifier,
        uint256 totalBound
    )
        public
        view
        returns (uint256 cost)
    {
        return currentCost._currentCostOfDot(registry, oracleAddress, specifier, totalBound);
    }

    function getDotsIssued(
        address oracleAddress,
        bytes32 specifier        
    )        
        public
        view
        returns (uint256 dots)
    {
        return stor.getTotalDots(oracleAddress, specifier);
    }

    function getDots(        
        address holderAddress,
        address oracleAddress,
        bytes32 specifier
    )
        public
        view        
        returns (uint256 dots)
    {
        return stor.getBoundDots(holderAddress, oracleAddress, specifier);
    }

    function _bond(
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numTok        
    )
        private
        returns (uint256 numDots) 
    {
        initializeProvider(holderAddress, oracleAddress);

        (numTok, numDots) = calcTok(oracleAddress, specifier, numTok);

        // User must have approved contract to transfer workingTOK
        //require(token.transferFrom(msg.sender, this, numTok * decimals));

        stor.updateBondValue(holderAddress, oracleAddress, specifier, numDots, "add");        
        stor.updateTotalIssued(oracleAddress, specifier, numDots, "add");
        stor.updateTotalBound(oracleAddress, specifier, numTok, "add");

        return numDots;
    }

    function _unbond(        
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots
    )
        private
        returns (uint256 numTok)
    {
        //currentDots
        uint256 bondValue = stor.getBondValue(holderAddress, oracleAddress, specifier);
        if (bondValue >= numDots && numDots > 0) {
            uint256 subTotal = 0;

            for (uint256 i = 0; i < numDots; i++) {
                subTotal += 1;

                numTok += currentCostOfDot(
                    oracleAddress,
                    specifier,
                    getDotsIssued(oracleAddress, specifier) - 1
                );     
            }       

            stor.updateTotalBound(oracleAddress, specifier, numTok, "sub");
            stor.updateTotalIssued(oracleAddress, specifier, numDots, "sub");
            stor.updateBondValue(holderAddress, oracleAddress, specifier, subTotal, "sub");

            if(token.transfer(holderAddress, numTok * decimals))
                return numTok;
        }
        return 0;
    }

    /// @dev Initialize uninitialized provider
    function initializeProvider(address holderAddress, address oracleAddress) private {
        if (!stor.isProviderInitialized(holderAddress, oracleAddress)) {            
            stor.setProviderInitialized(holderAddress, oracleAddress);
            stor.addHolderOracle(holderAddress, oracleAddress);
        }
    }
}
