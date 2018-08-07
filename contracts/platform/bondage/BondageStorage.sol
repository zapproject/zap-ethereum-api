pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";
import "../database/DatabaseInterface.sol";

contract BondageStorage is Ownable {

    DatabaseInterface public db;

    constructor(address database) public {
        db = DatabaseInterface(database);
    }
/*
    // Data structure for holder of ZAP bond to data provider.
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

    //holder => (oracleAddress => (endpoint => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    //oracleAddress=>(endpoint=>numZap)
    mapping(address => mapping(bytes32 => uint256)) private totalBound;

    //oracleAddress=>(endpoint=>numDots)
    mapping(address => mapping(bytes32 => uint256)) private totalIssued;*/

    /**** Get Methods ****/
    function isProviderInitialized(address holderAddress, address oracleAddress) external view returns (bool) {
        return db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress))) == 1 ? true : false;
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return uint(db.getNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint))));
        //return pendingEscrow[holderAddress][oracleAddress][endpoint];
    }

    function getNumZap(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return uint(db.getNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint))));
        //return totalBound[oracleAddress][endpoint];
    }

    function getDotsIssued(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return uint(db.getNumber(keccak256(abi.encodePacked('totalIssued', oracleAddress, endpoint))));
        //return totalIssued[oracleAddress][endpoint];
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return uint(db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint))));
        //return holders[holderAddress].bonds[endpoint][oracleAddress];
    }

    function getIndexSize(address holderAddress) external view returns (uint256) {
        return db.getAddressArrayLength(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')));
    }

    function getOracleAddress(address holderAddress, uint256 index) external view returns (address) {
        return db.getAddressArrayIndex(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), index);
        //return holders[holderAddress].oracleList[index];
    }

    /**** Set Methods ****/
    function addHolderOracle(address holderAddress, address oracleAddress) external onlyOwner {
        db.pushAddressArray(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), holderAddress);
        //holders[holderAddress].oracleList.push(oracleAddress);
    }

    function setProviderInitialized(address holderAddress, address oracleAddress) external onlyOwner {
        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress)), 1);
        //holders[holderAddress].initialized[oracleAddress] = true;
    }

    function updateEscrow(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op)
    external onlyOwner      
    {
        uint256 newEscrow = this.getNumEscrow(holderAddress, oracleAddress, endpoint);
        if (op == "sub"){
            newEscrow -= numDots;
             //pendingEscrow[holderAddress][oracleAddress][endpoint] -= numDots;
        } else {
            newEscrow += numDots;
          //  pendingEscrow[holderAddress][oracleAddress][endpoint] += numDots;
        }

        db.setNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)), newEscrow);
    }

    function updateBondValue(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op)
    external onlyOwner      
    {
        uint256 bondValue = this.getBoundDots(holderAddress, oracleAddress, endpoint);
        if (op == "sub") {
            bondValue -= numDots;
        }else {
            bondValue += numDots;
        }
        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)), numDots);
    }

    function updateTotalBound(address oracleAddress, bytes32 endpoint, uint256 numZap, bytes32 op)
    external onlyOwner       
    {
        uint256 totalBound = uint(db.getNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint))));
        if (op == "sub"){
            totalBound -= numZap;
        }else {
            totalBound += numZap;
        }
        db.setNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint)), totalBound);
    }

    function updateTotalIssued(address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op)
    external
    onlyOwner      
    {
        uint256 totalIssued = this.getDotsIssued(oracleAddress, endpoint);
        if (op == "sub"){
            totalIssued -= numDots;
        } else {
            totalIssued += numDots;
        }
    }

}
