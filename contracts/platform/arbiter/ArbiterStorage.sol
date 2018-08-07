pragma solidity ^0.4.24;

import "../../lib/ownership/Ownable.sol";
import "../database/DatabaseInterface.sol";

contract ArbiterStorage is Ownable {
    DatabaseInterface public db;

    constructor(address database) public {
        db = DatabaseInterface(database);
    }

    /// @dev get subscriber dots remaining for specified provider endpoint
    function getDots(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint64)
    {
        return uint64(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots'))));
    }

    /// @dev get first subscription block number
    function getBlockStart(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return uint96(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart'))));
    }

    /// @dev get last subscription block number
    function getPreBlockEnd(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
        view
        returns (uint96)
    {
        return uint96(db.getNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd'))));
    }

	/**** Set Methods ****/

    /// @dev store new subscription
    function setSubscription(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint,
        uint64 dots,
        uint96 blockStart,
        uint96 preBlockEnd
    )
        external
    {
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots')), dots);
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart')), uint256(blockStart));
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd')), uint256(preBlockEnd));
    }

    /**** Delete Methods ****/

    /// @dev remove subscription
    function deleteSubscription(
        address providerAddress,
        address subscriberAddress,
        bytes32 endpoint
    )
        external
    {
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'dots')), 0);
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'blockStart')), uint256(0));
        db.setNumber(keccak256(abi.encodePacked('subscriptions', providerAddress, subscriberAddress, endpoint, 'preBlockEnd')), uint256(0));
    }
}
