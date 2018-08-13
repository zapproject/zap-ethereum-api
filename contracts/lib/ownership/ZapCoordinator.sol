pragma solidity ^0.4.24;

import "./Ownable.sol";
import "./Upgradable.sol";
import "./ZapCoordinatorInterface.sol";
import "../../platform/database/DatabaseInterface.sol";

contract ZapCoordinator is Ownable, ZapCoordinatorInterface {

	event UpdatedContract(string name, address previousAddr, address newAddr);
	event UpdatedDependencies(uint timestamp, string contractName, address contractAddr);

	mapping(string => address) contracts; 

	// names of upgradable contracts
	string[] public loadedContracts;

	DatabaseInterface public db;

	// used for adding contracts like Database and ZapToken
	function addImmutableContract(string contractName, address newAddress) external onlyOwner {
		assert(contracts[contractName] == address(0));
		contracts[contractName] = newAddress;

		// Create DB object when Database is added to Coordinator
		bytes32 hash = keccak256(abi.encodePacked(contractName));
		if(hash == keccak256(abi.encodePacked("DATABASE"))) db = DatabaseInterface(newAddress);
	}

	// used for modifying an existing contract or adding a new contract to the system
	function updateContract(string contractName, address newAddress) external onlyOwner {
		address prev = contracts[contractName];
		if (prev == address(0) ) {
			// First time adding this contract
			loadedContracts.push(contractName);
		} else {
			// Deauth the old contract
			db.setStorageContract(prev, false);
		}
		// give new contract database access permission
		db.setStorageContract(newAddress, true);

		emit UpdatedContract(contractName, prev, newAddress);
		contracts[contractName] = newAddress;
	}

	function getContractName(uint index) public view returns (string) {
		return loadedContracts[index];
	}

	function getContract(string contractName) public view returns (address) {
		return contracts[contractName];
	}

	function updateAllDependencies() external onlyOwner {
		for ( uint i = 0; i < loadedContracts.length; i++ ) {
			address c = contracts[loadedContracts[i]];
			Upgradable(c).updateDependencies();
			emit UpdatedDependencies(block.timestamp, loadedContracts[i], c);
		}
	}

}