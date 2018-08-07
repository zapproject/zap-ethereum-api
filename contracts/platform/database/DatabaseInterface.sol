pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";

contract DatabaseInterface is Ownable {
	function setStorageContract(address _storageContract) public;
	function getBytes32(bytes32 key) external view returns(bytes32);
	function setBytes32(bytes32 key, bytes32 value) external;
	function getNumber(bytes32 key) external view returns(uint256);
	function setNumber(bytes32 key, uint256 value) external;
	function getBytes(bytes32 key) external view returns(bytes);
	function setBytes(bytes32 key, bytes value) external;
	function getString(bytes32 key) external view returns(string);
	function setString(bytes32 key, string value) external;
	function getArray(bytes32 key, uint256 index) external view returns (bytes32);
	function getArrayLength(bytes32 key) external view returns (uint256);
	function pushArray(bytes32 key, bytes32 value) external;
	function setArrayIndex(bytes32 key, uint256 index, bytes32 value) external;
	function setArray(bytes32 key, bytes32[] value) external;
}