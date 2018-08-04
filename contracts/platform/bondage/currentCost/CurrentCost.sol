pragma solidity ^0.4.24;

import "../../../lib/lifecycle/Destructible.sol";
import "../../../lib/platform/PiecewiseLogic.sol";
import "../../registry/RegistryInterface.sol";
import "./CurrentCostInterface.sol";

contract CurrentCost is Destructible, CurrentCostInterface {

    RegistryInterface registry;

    constructor(address registryAddress) public {
       registry = RegistryInterface(registryAddress);
    }

    /// @dev calculates current cost of dot
    /// @param oracleAddress oracle address
    /// @param endpoint oracle endpoint
    /// @param totalBound of already bounded dots
    /// @return cost of next dot
    function _currentCostOfDot(
        address oracleAddress,
        bytes32 endpoint,
        uint256 totalBound
    )
        public
        view
        returns (uint256 cost)
    {

        uint[] memory lens = new uint[](3);
        (lens[0],lens[1],lens[2]) = registry.getProviderArgsLength(oracleAddress,endpoint);
        int[] memory constants = new int[](lens[0]);
        uint[] memory  parts = new uint[](lens[1]);
        uint[] memory dividers = new uint[](lens[2]);

        (constants,parts,dividers) = registry.getProviderCurve(oracleAddress, endpoint);

        return uint256(PiecewiseLogic.evalutePiecewiseFunction(constants,parts,dividers,totalBound));
    }

    /// @dev calculates cost of n dots
    /// @param oracleAddress oracle address
    /// @param endpoint oracle endpoint
    /// @param totalBound of already bounded dots
    /// @param nDots to bond
    /// @return cost of next dot
    function _costOfNDots(
        address oracleAddress,
        bytes32 endpoint,
        uint256 totalBound,
        uint256 nDots
    )
        public
        view
        returns (uint256 cost)
    {

        uint[] memory lens = new uint[](3);
        (lens[0],lens[1],lens[2]) = registry.getProviderArgsLength(oracleAddress,endpoint);
        int[] memory constants = new int[](lens[0]);
        uint[] memory  parts = new uint[](lens[1]);
        uint[] memory dividers = new uint[](lens[2]);

        (constants,parts,dividers) = registry.getProviderCurve(oracleAddress, endpoint);

        return uint256(PiecewiseLogic.fastPiecewiseFunction(constants, parts, dividers, totalBound, nDots));
    }

   function _dotLimit( 
        address oracleAddress,
        bytes32 endpoint
    )
        public
        view
        returns (uint256 limit)
    {
        return registry.getDotLimit(oracleAddress, endpoint);
    }
}
