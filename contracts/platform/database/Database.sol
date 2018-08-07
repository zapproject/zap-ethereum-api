pragma solidity ^0.4.24;

import "./DatabaseInterface.sol";
import "../../lib/ownership/Ownable.sol";

contract Database is Ownable, DatabaseInterface {
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

	function get_b32(bytes32 key) external view returns(bytes32) {
		return data_bytes32[key];
	}

	function get_bs(bytes32 key) external view returns(bytes) {
		return data_bytes[key];
	}

	function get_ba(bytes32 key) external view returns(bytes32[]) {
		return data_bytesArray[key];
	}

	function set_b32(bytes32 key, bytes32 value) external {
		data_bytes32[key] = value;
	}

	function set_bs(bytes32 key, bytes value) external {
		data_bytes[key] = value;
	}

	function set_ba(bytes32 key, bytes32[] value) external {
		data_bytesArray[key] = value;
	}	
}