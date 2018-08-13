pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";

contract DatabaseInterface is Ownable {
	function setStorageContract(address _storageContract, bool _allowed) public;
	/*** Bytes32 ***/
	function getBytes32(bytes32 key) external view returns(bytes32);
	function setBytes32(bytes32 key, bytes32 value) external;
	/*** Number **/
	function getNumber(bytes32 key) external view returns(uint256);
	function setNumber(bytes32 key, uint256 value) external;
	/*** Bytes ***/
	function getBytes(bytes32 key) external view returns(bytes);
	function setBytes(bytes32 key, bytes value) external;
	/*** String ***/
	function getString(bytes32 key) external view returns(string);
	function setString(bytes32 key, string value) external;
	/*** Bytes Array ***/
	function getBytesArray(bytes32 key) external view returns (bytes32[]);
	function getBytesArrayIndex(bytes32 key, uint256 index) external view returns (bytes32);
	function getBytesArrayLength(bytes32 key) external view returns (uint256);
	function pushBytesArray(bytes32 key, bytes32 value) external;
	function setBytesArrayIndex(bytes32 key, uint256 index, bytes32 value) external;
	function setBytesArray(bytes32 key, bytes32[] value) external;
	/*** Int Array ***/
	function getIntArray(bytes32 key) external view returns (int[]);
	function getIntArrayIndex(bytes32 key, uint256 index) external view returns (int);
	function getIntArrayLength(bytes32 key) external view returns (uint256);
	function pushIntArray(bytes32 key, int value) external;
	function setIntArrayIndex(bytes32 key, uint256 index, int value) external;
	function setIntArray(bytes32 key, int[] value) external;
	/*** Address Array ***/
	function getAddressArray(bytes32 key) external view returns (address[]);
	function getAddressArrayIndex(bytes32 key, uint256 index) external view returns (address);
	function getAddressArrayLength(bytes32 key) external view returns (uint256);
	function pushAddressArray(bytes32 key, address value) external;
	function setAddressArrayIndex(bytes32 key, uint256 index, address value) external;
	function setAddressArray(bytes32 key, address[] value) external;
}