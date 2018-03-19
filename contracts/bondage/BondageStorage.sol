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
        //provider address  => (endpoint specifier => bond value)
        mapping (address => mapping(bytes32 => uint256)) bonds;
        //for traversing
        mapping (address => bool) initialized;
        address[] oracleList;
    }

    mapping(address => Holder) private holders;

    // (holder => (oracleAddress => (specifier => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    // (oracleAddress=>(=>numTOK)
    mapping(address => mapping(bytes32=> uint)) private totalBound;

    // (oracleAddress=>(specifier=>numDots)
    mapping(address => mapping(bytes32=> uint)) private totalIssued;

    /**** Get Methods ****/

    function isProviderInitialized(address holderAddress, address oracleAddress) public view returns (bool) {
        return holders[holderAddress].initialized[oracleAddress];
    }

    function getBondValue(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return holders[holderAddress].bonds[oracleAddress][specifier];
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return pendingEscrow[holderAddress][oracleAddress][specifier];
    }

    function getNumTok(address oracleAddress, bytes32 endpoint) external view returns (uint) {
        return totalBound[oracleAddress][endpoint];
    }

    function getTotalDots(address oracleAddress, bytes32 specifier) external view returns (uint) {
        return totalIssued[oracleAddress][specifier];
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint) {
        return holders[holderAddress].bonds[oracleAddress][specifier];
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
            holders[holderAddress].bonds[oracleAddress][specifier] -= numDots;
        else {
            holders[holderAddress].bonds[oracleAddress][specifier] += numDots;
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
            totalBound[oracleAddress][specifier] -= numDots;
        else {
            totalBound[oracleAddress][specifier] += numDots;
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
            totalIssued[oracleAddress][specifier] -= numDots;
        else {
            totalIssued[oracleAddress][specifier] += numDots;
        }
    }
}
