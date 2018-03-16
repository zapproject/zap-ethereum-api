pragma solidity ^0.4.18;

contract Client1 {
    function callback(uint256 id, string response1) external;
}
contract Client2 {
    function callback(uint256 id, string response1, string response2) external;
}
contract Client3 {
    function callback(uint256 id, string response1, string response2, string response3) external;
}
contract Client4 {
    function callback(uint256 id, string response1, string response2, string response3, string response4) external;
}