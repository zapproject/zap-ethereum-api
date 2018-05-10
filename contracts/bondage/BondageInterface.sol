pragma solidity ^0.4.19;

interface BondageInterface {
    function bond(address, bytes32, uint256) external returns(uint256);
    function unbond(address, bytes32, uint256) external returns (uint256);
    function delegateBond(address, address, bytes32, uint256) external returns(uint256);
    function delegateUnbond(address, address, bytes32, uint256) external returns(uint256);
    function resetDelegate(address) external;
    function escrowDots(address, address, bytes32, uint256) external returns (bool);
    function releaseDots(address, address, bytes32, uint256) external returns (bool);
    function calcZapForDots(address, bytes32, uint256) external view returns (uint256);
    function calcBondRate(address, bytes32, uint256) external view returns (uint256, uint256);
    function currentCostOfDot(address, bytes32, uint256) external view returns (uint256);
    function getDotsIssued(address, bytes32) external view returns (uint256);
    function getBoundDots(address, address, bytes32) external view returns (uint256);
    function getZapBound(address, bytes32) external view returns (uint256);
}
