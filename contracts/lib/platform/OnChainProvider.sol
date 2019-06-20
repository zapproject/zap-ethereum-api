pragma solidity ^0.5.0;

contract OnChainProvider {
    /// @dev function for requesting data from on-chain provider
    /// @param id request id
    /// @param userQuery query string
    /// @param endpoint endpoint specifier ala 'smart_contract'
    /// @param endpointParams endpoint-specific params
    function receive(uint256 id, string calldata userQuery, bytes32 endpoint, bytes32[] calldata endpointParams, bool onchainSubscriber) external;
}
