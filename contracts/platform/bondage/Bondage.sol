pragma solidity ^0.4.24;

import "../../lib/lifecycle/Destructible.sol";
import "../../lib/ownership/Upgradable.sol";
import "../../lib/ERC20.sol";
import "../database/DatabaseInterface.sol";
import "./currentCost/CurrentCostInterface.sol";
import "./BondageInterface.sol";

contract Bondage is Destructible, BondageInterface, Upgradable {
    DatabaseInterface public db;

    event Bound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numZap, uint256 numDots);
    event Unbound(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Escrowed(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Released(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);
    event Returned(address indexed holder, address indexed oracle, bytes32 indexed endpoint, uint256 numDots);


    CurrentCostInterface currentCost;
    ERC20 token;

    address public arbiterAddress;
    address public dispatchAddress;

    // For restricting dot escrow/transfer method calls to Dispatch and Arbiter
    modifier operatorOnly() {
        require(msg.sender == arbiterAddress || msg.sender == dispatchAddress, "Error: Operator Only Error");
        _;
    }

    /// @dev Initialize Storage, Token, and CurrentCost Contracts
    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
        arbiterAddress = coordinator.getContract("ARBITER");
        dispatchAddress = coordinator.getContract("DISPATCH");
        token = ERC20(coordinator.getContract("ZAP_TOKEN"));
        currentCost = CurrentCostInterface(coordinator.getContract("CURRENT_COST"));
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
    /// Called only by Dispatch or Arbiter Contracts
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
        uint256 boundDots = getBoundDots(holderAddress, oracleAddress, endpoint);
        require(numDots <= boundDots, "Error: Not enough dots bound");
        updateEscrow(holderAddress, oracleAddress, endpoint, numDots, "add");
        updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "sub");
        emit Escrowed(holderAddress, oracleAddress, endpoint, numDots);
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
        uint256 numEscrowed = getNumEscrow(holderAddress, oracleAddress, endpoint);
        require(numDots <= numEscrowed, "Error: Not enough dots Escrowed");
        updateEscrow(holderAddress, oracleAddress, endpoint, numDots, "sub");
        updateBondValue(oracleAddress, oracleAddress, endpoint, numDots, "add");
        emit Released(holderAddress, oracleAddress, endpoint, numDots);
        return true;
    }

    /// @dev Transfer N dots from destAddress to fromAddress.
    /// Called only by Disptach or Arbiter Contracts
    /// In smart contract endpoint, occurs per satisfied request.
    /// In socket endpoint called on termination of subscription.
    function returnDots(
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots
    )
        external
        operatorOnly
        returns (bool success)
    {
        uint256 numEscrowed = getNumEscrow(holderAddress, oracleAddress, endpoint);
        require(numDots <= numEscrowed, "Error: Not enough dots escrowed");
        updateEscrow(holderAddress, oracleAddress, endpoint, numDots, "sub");
        updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "add");
        emit Returned(holderAddress, oracleAddress, endpoint, numDots);
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


    /// @return total ZAP held by contract
    function getZapBound(address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return getNumZap(oracleAddress, endpoint);
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
        address broker = getEndpointBroker(oracleAddress, endpoint);

        if (broker != address(0)) {
            require(msg.sender == broker, "Error: Only the broker has access to this function");
        }

        // This also checks if oracle is registered w/ an initialized curve
        uint256 issued = getDotsIssued(oracleAddress, endpoint);
        require(issued + numDots <= dotLimit(oracleAddress, endpoint), "Error: Dot limit exceeded");

        uint256 numZap = currentCost._costOfNDots(oracleAddress, endpoint, issued + 1, numDots - 1);

        // User must have approved contract to transfer working ZAP
        require(token.transferFrom(msg.sender, this, numZap), "Error: User must have approved contract to transfer ZAP");

        if (!isProviderInitialized(holderAddress, oracleAddress)) {
            setProviderInitialized(holderAddress, oracleAddress);
            addHolderOracle(holderAddress, oracleAddress);
        }

        updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "add");
        updateTotalIssued(oracleAddress, endpoint, numDots, "add");
        updateTotalBound(oracleAddress, endpoint, numZap, "add");

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
        address broker = getEndpointBroker(oracleAddress, endpoint);

        if (broker != address(0)) {
            require(msg.sender == broker, "Error: Only the broker has access to this function");
        }

        // Make sure the user has enough to bond with some additional sanity checks
        uint256 amountBound = getBoundDots(holderAddress, oracleAddress, endpoint);
        require(amountBound >= numDots, "Error: Not enough dots bonded");
        require(numDots > 0, "Error: Dots to unbond must be more than zero");

        // Get the value of the dots
        uint256 issued = getDotsIssued(oracleAddress, endpoint);
        numZap = currentCost._costOfNDots(oracleAddress, endpoint, issued + 1 - numDots, numDots - 1);

        // Update the storage values
        updateTotalBound(oracleAddress, endpoint, numZap, "sub");
        updateTotalIssued(oracleAddress, endpoint, numDots, "sub");
        updateBondValue(holderAddress, oracleAddress, endpoint, numDots, "sub");

        // Do the transfer
        require(token.transfer(msg.sender, numZap), "Error: Transfer failed");

        return numZap;
    }

    /**** Get Methods ****/
    function isProviderInitialized(address holderAddress, address oracleAddress) public view returns (bool) {
        return db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress))) == 1 ? true : false;
    }

    /// @dev get broker address for endpoint
    function getEndpointBroker(address oracleAddress, bytes32 endpoint) public view returns (address) {
        return address(db.getBytes32(keccak256(abi.encodePacked('oracles', oracleAddress, endpoint, 'broker'))));
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)));
    }

    function getNumZap(address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint)));
    }

    function getDotsIssued(address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('totalIssued', oracleAddress, endpoint)));
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 endpoint) public view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)));
    }

    function getIndexSize(address holderAddress) external view returns (uint256) {
        return db.getAddressArrayLength(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')));
    }

    function getOracleAddress(address holderAddress, uint256 index) public view returns (address) {
        return db.getAddressArrayIndex(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), index);
    }

    /**** Set Methods ****/
    function addHolderOracle(address holderAddress, address oracleAddress) internal {
        db.pushAddressArray(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), oracleAddress);
    }

    function setProviderInitialized(address holderAddress, address oracleAddress) internal {
        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress)), 1);
    }

    function updateEscrow(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) internal {
        uint256 newEscrow = db.getNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)));

        if (op == "sub") {
            newEscrow -= numDots;
        } else if (op == "add") {
            newEscrow += numDots;
        }
        else {
            revert();
        }

        db.setNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)), newEscrow);
    }

    function updateBondValue(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) internal {
        uint256 bondValue = db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)));

        if (op == "sub") {
            bondValue -= numDots;
        } else if (op == "add") {
            bondValue += numDots;
        }

        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)), bondValue);
    }

    function updateTotalBound(address oracleAddress, bytes32 endpoint, uint256 numZap, bytes32 op) internal {
        uint256 totalBound = db.getNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint)));

        if (op == "sub"){
            totalBound -= numZap;
        } else if (op == "add") {
            totalBound += numZap;
        }
        else {
            revert();
        }

        db.setNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint)), totalBound);
    }

    function updateTotalIssued(address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) internal {
        uint256 totalIssued = db.getNumber(keccak256(abi.encodePacked('totalIssued', oracleAddress, endpoint)));

        if (op == "sub"){
            totalIssued -= numDots;
        } else if (op == "add") {
            totalIssued += numDots;
        }
        else {
            revert();
        }

        db.setNumber(keccak256(abi.encodePacked('totalIssued', oracleAddress, endpoint)), totalIssued);
    }
}

    /*************************************** STORAGE ****************************************
    * 'holders', holderAddress, 'initialized', oracleAddress => {uint256} 1 -> provider-subscriber initialized, 0 -> not initialized
    * 'holders', holderAddress, 'bonds', oracleAddress, endpoint => {uint256} number of dots this address has bound to this endpoint
    * 'oracles', oracleAddress, endpoint, 'broker' => {address} address of endpoint broker, 0 if none
    * 'escrow', holderAddress, oracleAddress, endpoint => {uint256} amount of Zap that have been escrowed
    * 'totalBound', oracleAddress, endpoint => {uint256} amount of Zap bound to this endpoint
    * 'totalIssued', oracleAddress, endpoint => {uint256} number of dots issued by this endpoint
    * 'holders', holderAddress, 'oracleList' => {address[]} array of oracle addresses associated with this holder
    ****************************************************************************************/
