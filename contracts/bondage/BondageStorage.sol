pragma solidity ^0.4.17;
// v1.0

/* ******************************************************************
/* MAKE SURE TO transferOwnership TO Bondage Contract UPON DEPLOYMENT
/* ******************************************************************/

import "../aux/Ownable.sol";

contract BondageStorage is Ownable {

    // Data structure for holder of TOK bond to data provider.
    // Currently ONLY "smart_contract" or "socket_subscription"
    struct Holder {
        //endpoint specifier* => (provider address => bond value)
        mapping(bytes32 => mapping(address => uint256)) bonds;
        //provider address => initialized flag
        mapping(address => bool) initialized;
        //for traversing
        address[] oracleList;
    }

    mapping(address => Holder) private holders;

    //holder => (oracle_address => (specifier => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    //specifier* => (oracle_address => numTOK)
    mapping(bytes32 => mapping(address=> uint)) private totalBound;

    //specifier* => (oracle_address => numDots)
    mapping(bytes32 => mapping(address=> uint)) private totalIssued;

    /**** Get Methods ****/
    function isProviderInitialized(address holder_address, address oracle_address) external view returns (bool) {
        return holders[holder_address].initialized[oracle_address];
    }

    function getBondValue(address holder_address, address oracle_address, bytes32 specifier) external view returns (uint) {
        return holders[holder_address].bonds[specifier][oracle_address];
    }

    function getNumEscrow(address holder_address, address oracle_address, bytes32 specifier) external view returns (uint) {
        return pendingEscrow[holder_address][oracle_address][specifier];
    }

    function getNumTok(address oracle_address, bytes32 endpoint) external view returns (uint) {
        return totalBound[endpoint][oracle_address];
    }

    function getTotalDots(address oracle_address, bytes32 specifier) external view returns (uint) {
        return totalIssued[specifier][oracle_address];
    }

    function getBoundDots(address holder_address, address oracle_address, bytes32 specifier) external view returns (uint) {
        return holders[holder_address].bonds[specifier][oracle_address];
    }

    function getIndexSize(address holder_address) external view returns (uint) {
        return holders[holder_address].oracleList.length;
    }

    function getOracleAddress(address holder_address, uint256 index) external view returns (address) {
        return holders[holder_address].oracleList[index];
    }    

	/**** Set Methods ****/
    function addHolderOracle(address holder_address, address oracle_address) external onlyOwner {
        holders[holder_address].oracleList.push(oracle_address);
    }

    function setProviderInitialized(address holder_address, address oracle_address) external onlyOwner {
        holders[holder_address].initialized[oracle_address] = true;
    }

    function updateEscrow(
        address holder_address,
        address oracle_address,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            pendingEscrow[holder_address][oracle_address][specifier] -= numDots;
        else {
            pendingEscrow[holder_address][oracle_address][specifier] += numDots;
        }
    }

    function updateBondValue(
        address holder_address,
        address oracle_address,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            holders[holder_address].bonds[specifier][oracle_address] -= numDots;
        else {
            holders[holder_address].bonds[specifier][oracle_address] += numDots;
        }
    }

    function updateTotalBound(        
        address oracle_address,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner       
    {
        if (keccak256(op) == keccak256("sub"))
            totalBound[specifier][oracle_address] -= numDots;
        else {
            totalBound[specifier][oracle_address] += numDots;
        }
    }

    function updateTotalIssued(
        address oracle_address,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            totalIssued[specifier][oracle_address] -= numDots;
        else {
            totalIssued[specifier][oracle_address] += numDots;
        }
    }
}