pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";

contract DatabaseInterface is Ownable {
	function setStorageContract(address _storageContract) public;
	function get_b32(bytes32 key) external view returns(bytes32);
	function get_bs(bytes32 key) external view returns(bytes);
	function get_ba(bytes32 key) external view returns(bytes32[]);
	function set_b32(bytes32 key, bytes32 value) external;
	function set_bs(bytes32 key, bytes value) external;
	function set_ba(bytes32 key, bytes32[] value) external;	
}