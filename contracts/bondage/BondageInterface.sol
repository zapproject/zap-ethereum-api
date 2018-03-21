pragma solidity ^0.4.17;
// v1.0

// Make sure to implement a setBondageAddress fx in contracts that use this interface to support upgrades

interface BondageInterface {
    function bond(address, bytes32, uint256) external returns(uint256);
    function unbond(address, bytes32, uint256) external returns (uint256);
    function escrowDots(address, address, bytes32, uint256) external returns (bool);
    function releaseDots(address, address, bytes32, uint256) external returns (bool);
    function calcTokForDots(address, bytes32, uint256) external view returns (uint256);
    function calcTok(address, bytes32, uint256) external view returns (uint256, uint256);
    function currentCostOfDot(address, bytes32, uint256) external view returns (uint256);
    function getDotsIssued(address, bytes32) external view returns (uint256);
    function getDots(address, address, bytes32) external view returns (uint256);
    function getTokBound(address, bytes32) external view returns (uint256);


    function getIndexSize(address holderAddress) external view returns (uint);
    function getOracleAddress(address holderAddress, uint256 index) external view returns (address);
    function getBoundDots(address holderAddress, address oracleAddress, bytes32 specifier) external view returns (uint);


}
