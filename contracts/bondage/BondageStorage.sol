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
        mapping (bytes32 => mapping(address => uint256)) bonds;
        //provider address => initialized flag
        mapping (address => bool) initialized;
        //for traversing
        address[] oracleList;
    }

    mapping(address => Holder) private holders;

    // (holder => (oracleAddress => (specifier => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    // (specifier=>(oracleAddress=>numTOK)
    mapping(bytes32 => mapping(address=> uint)) private totalBound;

    // (specifier=>(oracleAddress=>numDots)
    mapping(bytes32 => mapping(address=> uint)) private totalIssued;

    /**** Get Methods ****/

    function isProviderInitialized(address holderAddress, address oracleAddress) external view returns (bool) {
        return holders[holderAddress].initialized[oracleAddress];
    }

    function getBondValue(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return holders[holderAddress].bonds[specifier][oracleAddress];
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return pendingEscrow[holderAddress][oracleAddress][specifier];
    }

    function getNumTok(address oracleAddress, bytes32 endpoint) external view returns (uint) {
        return totalBound[endpoint][oracleAddress];
    }

    function getTotalDots(address oracleAddress, bytes32 specifier) external view returns (uint) {
        return totalIssued[specifier][oracleAddress];
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return holders[holderAddress].bonds[specifier][oracleAddress];
    }

    function getIndexSize(address holderAddress) external view returns (uint) {
        return holders[holderAddress].oracleList.length;
    }

    function getOracleAddress(address holderAddress, uint256 index) external view returns (address) {
        return holders[holderAddress].oracleList[index];
    }    

	/**** Set Methods ****/

    function addHolderOracle(address holderAddress, address oracleAddress) external onlyOwner {
        holders[holderAddress].oracleList.push(oracleAddress);
    }

    function setProviderInitialized(address holderAddress, address oracleAddress) external onlyOwner {
        holders[holderAddress].initialized[oracleAddress] = true;
    }

    function updateEscrow(
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            pendingEscrow[holderAddress][oracleAddress][specifier] -= numDots;
        else {
            pendingEscrow[holderAddress][oracleAddress][specifier] += numDots;
        }
    }

    function updateBondValue(
        address holderAddress,
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        //onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            holders[holderAddress].bonds[specifier][oracleAddress] -= numDots;
        else {
            holders[holderAddress].bonds[specifier][oracleAddress] += numDots;
        }
    }

    function updateTotalBound(        
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner       
    {
        if (keccak256(op) == keccak256("sub"))
            totalBound[specifier][oracleAddress] -= numDots;
        else {
            totalBound[specifier][oracleAddress] += numDots;
        }
    }

    function updateTotalIssued(
        address oracleAddress,
        bytes32 specifier,
        uint256 numDots,
        string op
    )
        external
        onlyOwner      
    {
        if (keccak256(op) == keccak256("sub"))
            totalIssued[specifier][oracleAddress] -= numDots;
        else {
            totalIssued[specifier][oracleAddress] += numDots;
        }
    }
}