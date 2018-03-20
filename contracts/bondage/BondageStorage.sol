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
        //endpoint specifer* => (provider address => bond value)
        mapping(bytes32 => mapping(address => uint256)) bonds;
        //provider address => initialized flag
        mapping(address => bool) initialized;
        //for traversing
        address[] oracleList;
    }

    mapping(address => Holder) private holders;

    //holder => (oracle_address => (endpoint => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    //oracleAddress=>(=>numTOK)
    mapping(address => mapping(bytes32 => uint)) private totalBound;

    //oracleAddress=>(endpoint=>numDots)
    mapping(address => mapping(bytes32 => uint)) private totalIssued;

    /**** Get Methods ****/
    function isProviderInitialized(address holder_address, address oracle_address) external view returns (bool) {
        return holders[holder_address].initialized[oracle_address];
    }

    function getBondValue(address holder_address, address oracle_address, bytes32 endpoint) external view returns (uint) {
        return holders[holder_address].bonds[endpoint][oracle_address];
    }

    function getNumEscrow(address holder_address, address oracle_address, bytes32 endpoint) external view returns (uint) {
        return pendingEscrow[holder_address][oracle_address][endpoint];
    }

    function getNumTok(address oracle_address, bytes32 endpoint) external view returns (uint) {
        return totalBound[oracle_address][endpoint];
    }

    function getTotalDots(address oracle_address, bytes32 endpoint) external view returns (uint) {
        return totalIssued[oracle_address][endpoint];
    }

    function getBoundDots(address holder_address, address oracle_address, bytes32 endpoint) external view returns (uint) {
        return holders[holder_address].bonds[endpoint][oracle_address];
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
        bytes32 endpoint,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            pendingEscrow[holder_address][oracle_address][endpoint] -= numDots;
        else {
            pendingEscrow[holder_address][oracle_address][endpoint] += numDots;
        }
    }

    function updateBondValue(
        address holder_address,
        address oracle_address,
        bytes32 endpoint,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            holders[holder_address].bonds[endpoint][oracle_address] -= numDots;
        else {
            holders[holder_address].bonds[endpoint][oracle_address] += numDots;
        }
    }

    function updateTotalBound(        
        address oracle_address,
        bytes32 endpoint,
        uint256 numDots,
        string op
    )
        external
        onlyOwner       
    {
        if (keccak256(op) == keccak256("sub"))
            totalBound[oracle_address][endpoint] -= numDots;
        else {
            totalBound[oracle_address][endpoint] += numDots;
        }
    }

    function updateTotalIssued(
        address oracle_address,
        bytes32 endpoint,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            totalIssued[oracle_address][endpoint] -= numDots;
        else {
            totalIssued[oracle_address][endpoint] += numDots;
        }
    }
}