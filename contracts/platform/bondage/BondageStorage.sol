pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";
import "../../lib/ownership/Upgradable.sol";
import "../database/DatabaseInterface.sol";

contract BondageStorage is Ownable, Upgradable {
    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
    }

    /**** Get Methods ****/
    function isProviderInitialized(address holderAddress, address oracleAddress) external view returns (bool) {
        return db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress))) == 1 ? true : false;
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)));
    }

    function getNumZap(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('totalBound', oracleAddress, endpoint)));
    }

    function getDotsIssued(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('totalIssued', oracleAddress, endpoint)));
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)));
    }

    function getIndexSize(address holderAddress) external view returns (uint256) {
        return db.getAddressArrayLength(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')));
    }

    function getOracleAddress(address holderAddress, uint256 index) external view returns (address) {
        return db.getAddressArrayIndex(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), index);
    }

    /**** Set Methods ****/
    function addHolderOracle(address holderAddress, address oracleAddress) external onlyOwner {
        db.pushAddressArray(keccak256(abi.encodePacked('holders', holderAddress, 'oracleList')), oracleAddress);
    }

    function setProviderInitialized(address holderAddress, address oracleAddress) external onlyOwner {
        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'initialized', oracleAddress)), 1);
    }

    function updateEscrow(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) external onlyOwner {
        uint256 newEscrow = db.getNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)));

        if ( op == "sub" ) {
            newEscrow -= numDots;
        } else if ( op == "add" ) {
            newEscrow += numDots;
        }
        else {
            revert();
        }

        db.setNumber(keccak256(abi.encodePacked('escrow', holderAddress, oracleAddress, endpoint)), newEscrow);
    }

    function updateBondValue(address holderAddress, address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) external onlyOwner {
        uint256 bondValue = db.getNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)));
        
        if (op == "sub") {
            bondValue -= numDots;
        } else if (op == "add") {
            bondValue += numDots;
        }

        db.setNumber(keccak256(abi.encodePacked('holders', holderAddress, 'bonds', oracleAddress, endpoint)), bondValue);
    }

    function updateTotalBound(address oracleAddress, bytes32 endpoint, uint256 numZap, bytes32 op) external onlyOwner {
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

    function updateTotalIssued(address oracleAddress, bytes32 endpoint, uint256 numDots, bytes32 op) external onlyOwner {
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
