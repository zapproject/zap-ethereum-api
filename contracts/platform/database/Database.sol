pragma solidity ^0.4.24;

import "./DatabaseInterface.sol";
import "../../lib/ownership/Ownable.sol";

contract Database is Ownable, DatabaseInterface {
	event StorageModified(address indexed contractAddress, bool allowed);

	mapping (bytes32 => bytes32) data_bytes32;
	mapping (bytes32 => bytes) data_bytes;
	mapping (bytes32 => bytes32[]) data_bytesArray;
	mapping (bytes32 => int[]) data_intArray;
	mapping (bytes32 => address[]) data_addressArray;
	mapping (address => bool) allowed;

	constructor() public {

	}

	modifier storageOnly {
		require(allowed[msg.sender], "Error: Access not allowed to storage");
		_;
	}

	function setStorageContract(address _storageContract, bool _allowed) public onlyOwner {
		require(_storageContract != address(0), "Error: Address zero is invalid storage contract");
		allowed[_storageContract] = _allowed;
		emit StorageModified(_storageContract, _allowed);
	}

	/*** Bytes32 ***/
	function getBytes32(bytes32 key) external view returns(bytes32) {
		return data_bytes32[key];
	}

	function setBytes32(bytes32 key, bytes32 value) external storageOnly  {
		data_bytes32[key] = value;
	}

	/*** Number **/
	function getNumber(bytes32 key) external view returns(uint256) {
		return uint256(data_bytes32[key]);
	}

	function setNumber(bytes32 key, uint256 value) external storageOnly {
		data_bytes32[key] = bytes32(value);
	}

	/*** Bytes ***/
	function getBytes(bytes32 key) external view returns(bytes) {
		return data_bytes[key];
	}

	function setBytes(bytes32 key, bytes value) external storageOnly {
		data_bytes[key] = value;
	}

	/*** String ***/
	function getString(bytes32 key) external view returns(string) {
		return string(data_bytes[key]);
	}

	function setString(bytes32 key, string value) external storageOnly {
		data_bytes[key] = bytes(value);
	}

	/*** Bytes Array ***/
	function getBytesArray(bytes32 key) external view returns (bytes32[]) {
		return data_bytesArray[key];
	}

	function getBytesArrayIndex(bytes32 key, uint256 index) external view returns (bytes32) {
		return data_bytesArray[key][index];
	}

	function getBytesArrayLength(bytes32 key) external view returns (uint256) {
		return data_bytesArray[key].length;
	}

	function pushBytesArray(bytes32 key, bytes32 value) external {
		data_bytesArray[key].push(value);
	}

	function setBytesArrayIndex(bytes32 key, uint256 index, bytes32 value) external storageOnly {
		data_bytesArray[key][index] = value;
	}

	function setBytesArray(bytes32 key, bytes32[] value) external storageOnly {
		data_bytesArray[key] = value;
	}

	/*** Int Array ***/
	function getIntArray(bytes32 key) external view returns (int[]) {
		return data_intArray[key];
	}

	function getIntArrayIndex(bytes32 key, uint256 index) external view returns (int) {
		return data_intArray[key][index];
	}

	function getIntArrayLength(bytes32 key) external view returns (uint256) {
		return data_intArray[key].length;
	}

	function pushIntArray(bytes32 key, int value) external {
		data_intArray[key].push(value);
	}

	function setIntArrayIndex(bytes32 key, uint256 index, int value) external storageOnly {
		data_intArray[key][index] = value;
	}

	function setIntArray(bytes32 key, int[] value) external storageOnly {
		data_intArray[key] = value;
	}

	/*** Address Array ***/
	function getAddressArray(bytes32 key) external view returns (address[]) {
		return data_addressArray[key];
	}

	function getAddressArrayIndex(bytes32 key, uint256 index) external view returns (address) {
		return data_addressArray[key][index];
	}

	function getAddressArrayLength(bytes32 key) external view returns (uint256) {
		return data_addressArray[key].length;
	}

	function pushAddressArray(bytes32 key, address value) external {
		data_addressArray[key].push(value);
	}

	function setAddressArrayIndex(bytes32 key, uint256 index, address value) external storageOnly {
		data_addressArray[key][index] = value;
	}

	function setAddressArray(bytes32 key, address[] value) external storageOnly {
		data_addressArray[key] = value;
	}
}