pragma solidity ^0.4.24;

import "./DatabaseInterface.sol";
import "../../lib/ownership/Ownable.sol";
import "../../lib/ownership/Upgradable.sol";

contract Database is Ownable, DatabaseInterface, Upgradable {
	event StorageTransferred(address indexed previousStorage, address indexed _storageContract);

	mapping (bytes32 => bytes32) data_bytes32;
	mapping (bytes32 => bytes) data_bytes;
	mapping (bytes32 => bytes32[]) data_bytesArray;

	address public storageContract;

	constructor(address _storageContract) public {
		storageContract = _storageContract;
	}

	modifier storageOnly {
		if (msg.sender == storageContract)
			_;
	}

	function setStorageContract(address _storageContract) public onlyOwner {
		require(_storageContract != address(0));
		emit StorageTransferred(owner, _storageContract);
		storageContract = _storageContract;
	}

	function getBytes32(bytes32 key) external view returns(bytes32) {
		return data_bytes32[key];
	}

	function setBytes32(bytes32 key, bytes32 value) external {
		data_bytes32[key] = value;
	}

	function getNumber(bytes32 key) external view returns(uint256) {
		return uint256(data_bytes32[key]);
	}

	function setNumber(bytes32 key, uint256 value) external {
		data_bytes32[key] = bytes32(value);
	}

	function getBytes(bytes32 key) external view returns(bytes) {
		return data_bytes[key];
	}

	function setBytes(bytes32 key, bytes value) external {
		data_bytes[key] = value;
	}

	function getString(bytes32 key) external view returns(string) {
		return string(data_bytes[key]);
	}

	function setString(bytes32 key, string value) external {
		data_bytes[key] = bytes(value);
	}

	function getArray(bytes32 key, uint256 index) external view returns (bytes32) {
		return data_bytesArray[key][index];
	}

	function getArrayLength(bytes32 key) external view returns (uint256) {
		return data_bytesArray[key].length;
	}

	function pushArray(bytes32 key, bytes32 value) external {
		data_bytesArray[key].push(value);
	}

	function setArray(bytes32 key, bytes32[] value) external {
		data_bytesArray[key] = value;
	}
}