pragma solidity ^0.5.0;

import "./Ownable.sol";

contract ZapCoordinatorInterface is Ownable {
    function addImmutableContract(string calldata contractName, address newAddress) external;
    function updateContract(string calldata contractName, address newAddress) external;
    function getContractName(uint index) public view returns (string memory);
    function getContract(string memory contractName) public view returns (address);
    function updateAllDependencies() external;
}
