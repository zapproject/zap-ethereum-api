pragma solidity ^0.4.19;

import "../lib/Ownable.sol";

contract BondageStorage is Ownable {

    // Data structure for holder of ZAP bond to data provider.
    // Currently ONLY "smart_contract" or "socket_subscription"
    struct Holder {
        //endpoint specifer* => (provider address => bond value)
        mapping(bytes32 => mapping(address => uint256)) bonds;
        //provider address => initialized flag
        mapping(address => bool) initialized;
        //for traversing
        address[] oracleList;
        //provider address => delegate address
        mapping(address => address) delegates;
    }

    mapping(address => Holder) private holders;

    //holder => (oracleAddress => (endpoint => numEscrow)))
    mapping(address => mapping(address => mapping(bytes32 => uint256))) private pendingEscrow;

    //oracleAddress=>(endpoint=>numZap)
    mapping(address => mapping(bytes32 => uint256)) private totalBound;

    //oracleAddress=>(endpoint=>numDots)
    mapping(address => mapping(bytes32 => uint256)) private totalIssued;

    /**** Get Methods ****/
    function isProviderInitialized(address holderAddress, address oracleAddress) external view returns (bool) {
        return holders[holderAddress].initialized[oracleAddress];
    }

    function getBondValue(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return holders[holderAddress].bonds[endpoint][oracleAddress];
    }

    function getNumEscrow(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return pendingEscrow[holderAddress][oracleAddress][endpoint];
    }

    function getNumZap(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return totalBound[oracleAddress][endpoint];
    }

    function getDotsIssued(address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return totalIssued[oracleAddress][endpoint];
    }

    function getBoundDots(address holderAddress, address oracleAddress, bytes32 endpoint) external view returns (uint256) {
        return holders[holderAddress].bonds[endpoint][oracleAddress];
    }

    function getIndexSize(address holderAddress) external view returns (uint256) {
        return holders[holderAddress].oracleList.length;
    }

    function getOracleAddress(address holderAddress, uint256 index) external view returns (address) {
        return holders[holderAddress].oracleList[index];
    }

    function getDelegate(address holderAddress, address oracleAddress) external view returns (address) {
        return holders[holderAddress].delegates[oracleAddress];
    }

    /**** Set Methods ****/
    function addHolderOracle(address holderAddress, address oracleAddress) external onlyOwner {
        holders[holderAddress].oracleList.push(oracleAddress);
    }

    function setProviderInitialized(address holderAddress, address oracleAddress) external onlyOwner {
        holders[holderAddress].initialized[oracleAddress] = true;
    }

    function setDelegate(address holderAddress, address oracleAddress, address delegateAddress) external onlyOwner {
        holders[holderAddress].delegates[oracleAddress] = delegateAddress;
    }

    function updateEscrow(
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots,
        bytes32 op
    )
        external
        onlyOwner      
    {
        if (op == "sub")
            pendingEscrow[holderAddress][oracleAddress][endpoint] -= numDots;
        else {
            pendingEscrow[holderAddress][oracleAddress][endpoint] += numDots;
        }
    }

    function updateBondValue(
        address holderAddress,
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots,
        bytes32 op
    )
        external
        onlyOwner      
    {
        if (op == "sub") 
            holders[holderAddress].bonds[endpoint][oracleAddress] -= numDots;
        else {
            holders[holderAddress].bonds[endpoint][oracleAddress] += numDots;
        }
    }

    function updateTotalBound(        
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots,
        bytes32 op
    )
        external
        onlyOwner       
    {
        if (op == "sub")
            totalBound[oracleAddress][endpoint] -= numDots;
        else {
            totalBound[oracleAddress][endpoint] += numDots;
        }
    }

    function updateTotalIssued(
        address oracleAddress,
        bytes32 endpoint,
        uint256 numDots,
        bytes32 op
    )
        external
        onlyOwner      
    {
        if (op == "sub")
            totalIssued[oracleAddress][endpoint] -= numDots;
        else {
            totalIssued[oracleAddress][endpoint] += numDots;
        }
    }

    /**** Delete Methods ****/
    function deleteDelegate(address holderAddress, address oracleAddress) external onlyOwner {
        delete holders[holderAddress].delegates[oracleAddress];
    }
}
