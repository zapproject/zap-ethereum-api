pragma solidity ^0.4.24;

contract Client1 {
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response1 first provider-specified param
    function callback(uint256 id, string response1) external;
}
contract Client2 {
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response1 first provider-specified param
    /// @param response2 second provider-specified param
    function callback(uint256 id, string response1, string response2) external;
}
contract Client3 {
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response1 first provider-specified param
    /// @param response2 second provider-specified param
    /// @param response3 third provider-specified param
    function callback(uint256 id, string response1, string response2, string response3) external;
}
contract Client4 {
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response1 first provider-specified param
    /// @param response2 second provider-specified param
    /// @param response3 third provider-specified param
    /// @param response4 fourth provider-specified param
    function callback(uint256 id, string response1, string response2, string response3, string response4) external;
}

contract ClientBytes32Array {
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response bytes32 array
    function callback(uint256 id, bytes32[] response) external;
}

contract ClientIntArray{
    /// @dev callback that provider will call after Dispatch.query() call
    /// @param id request id
    /// @param response int array
    function callback(uint256 id, int[] response) external;
}

