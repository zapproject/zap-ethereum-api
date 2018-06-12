pragma solidity ^0.4.24;
import "../dispatch/Dispatch.sol";

contract OnChainProvider {
    /// @dev function for requesting data from on-chain provider
    /// @param id request id
    /// @param userQuery query string
    /// @param endpoint endpoint specifier ala 'smart_contract'
    /// @param endpointParams endpoint-specific params
    function receive(uint256 id, string userQuery, bytes32 endpoint, bytes32[] endpointParams) external;
}
