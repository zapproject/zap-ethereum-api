pragma solidity ^0.4.19;

contract OnChainProvider {
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external;
}

