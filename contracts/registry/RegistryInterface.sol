pragma solidity ^0.4.19;

import "../lib/PiecewiseStorage.sol";

// Technically an abstract contract, not interface (solidity compiler devs are working to fix this right now)

contract RegistryInterface {
	enum CurveType { None, Linear, Exponential, Logarithmic }
    function initiateProvider(uint256, string, bytes32, bytes32[]) public returns (bool);
    function initiateProviderCurve(bytes32) public;
    function setEndpointParams(bytes32, bytes32[]) public;
    function getProviderPublicKey(address) public view returns (uint256);
    function getProviderTitle(address) public view returns (string);
	function getNextRouteKey(address, bytes32, uint256) public view returns (uint256, bytes32);
    function getNextProvider(uint256) public view returns (uint256, address, uint256, string);
    function getCurveUnset(address, bytes32) public view returns (bool);

    // Curve access
    function getCurvePiecesLength(address provider, bytes32 endpoint) external view returns (uint64);
    function getCurveDividersLength(address provider, bytes32 endpoint) external view returns (uint64);
    function getCurveDivider(address provider, bytes32 endpoint, uint64 dividerNum) external view returns (uint);
    function getCurvePieceInfo(address provider, bytes32 endpoint, uint64 pieceNum) external view returns (uint start, uint end, uint64 termsLength);
    function getCurveTerm(address provider, bytes32 endpoint, uint64 pieceNum, uint64 termNum) external view returns (int coef, int power, int fn);
}
