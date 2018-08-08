pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";
import "../../lib/ownership/Upgradable.sol";
import "../database/DatabaseInterface.sol";

contract DispatchStorage is Ownable, Upgradable {
    enum Status { Pending, Fulfilled }

    DatabaseInterface public db;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        address databaseAddress = coordinator.getContract("DATABASE");
        db = DatabaseInterface(databaseAddress);
    }
    /// @dev get provider address of request
    /// @param id request id
    function getProvider(uint256 id) external view returns (address) {
        return address(db.getNumber(keccak256(abi.encodePacked('queries', id, 'provider'))));
    }

    /// @dev get subscriber address of request
    /// @param id request id
    function getSubscriber(uint256 id) external view returns (address) {
        return address(db.getNumber(keccak256(abi.encodePacked('queries', id, 'subscriber'))));
    }

    /// @dev get endpoint of request
    /// @param id request id
    function getEndpoint(uint256 id) external view returns (bytes32) {
        return db.getBytes32(keccak256(abi.encodePacked('queries', id, 'endpoint')));
    }

    /// @dev get status of request
    /// @param id request id
    function getStatus(uint256 id) external view returns (Status) {
        return Status(db.getNumber(keccak256(abi.encodePacked('queries', id, 'status'))));
    }

    /// @dev get user specified query of request
    /// @param id request id
    function getUserQuery(uint256 id) external view returns (string) {
        return db.getString(keccak256(abi.encodePacked('queries', id, 'userQuery')));
    }

    /// @dev is subscriber contract or offchain 
    /// @param id request id
    function getSubscriberOnchain(uint256 id) external view returns (bool) {
        uint res = db.getNumber(keccak256(abi.encodePacked('queries', id, 'onchainSubscriber')));
        return res == 1 ? true : false;
    }
 

	/**** Set Methods ****/
    function createQuery(
        uint256 id,
        address provider,
        address subscriber,
        bytes32 endpoint,
        string userQuery,
        bool onchainSubscriber
    ) 
        external
        onlyOwner
    {
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'provider')), uint256(provider));
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'subscriber')), uint256(subscriber));
        db.setBytes32(keccak256(abi.encodePacked('queries', id, 'endpoint')), endpoint);
        db.setString(keccak256(abi.encodePacked('queries', id, 'userQuery')), userQuery);
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Pending));
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'onchainSubscriber')), onchainSubscriber ? 1 : 0);
    }

    function setFulfilled(uint256 id) external onlyOwner {
        db.setNumber(keccak256(abi.encodePacked('queries', id, 'status')), uint256(Status.Fulfilled));
    }
}
