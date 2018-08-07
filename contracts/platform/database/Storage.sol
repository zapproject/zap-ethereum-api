pragma solidity ^0.4.24;

import "../../lib/lifecycle/Destructible.sol";
import "./DatabaseInterface.sol";

contract Storage is Destructible {
    DatabaseInterface public database;

    constructor(address databaseAddress) public {
        database = DatabaseInterface(databaseAddress);
    }
}