pragma solidity ^0.4.18;

contract Client1 {
    function callback(uint256 id, string _response1) external;
}
contract Client2 {
    function callback(uint256 id, string _response1, string _response2) external;
}
contract Client3 {
    function callback(uint256 id, string _response1, string _response2, string _response3) external;
}
contract Client4 {
    function callback(uint256 id, string _response1, string _response2, string _response3, string _response4) external;
}