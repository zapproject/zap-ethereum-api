pragma solidity ^0.4.24;

import "../../../lib/lifecycle/Destructible.sol";
import "../../../lib/ownership/Upgradable.sol";
import "../../../lib/platform/PiecewiseLogic.sol";
import "../../registry/RegistryInterface.sol";
import "./CurrentCostInterface.sol";


contract CurrentCost is Destructible, CurrentCostInterface, Upgradable {

    RegistryInterface registry;

    constructor(address c) Upgradable(c) public {
        _updateDependencies();
    }

    function _updateDependencies() internal {
        registry = RegistryInterface(coordinator.getContract("REGISTRY"));
    }

    /// @dev calculates current cost of dot
    /// @param oracleAddress oracle address
    /// @param endpoint oracle endpoint
    /// @param start nth dot to calculate price of
    /// @return cost of next dot
    function _currentCostOfDot(
        address oracleAddress,
        bytes32 endpoint,
        uint256 start
    )
        public
        view
        returns (uint256 cost)
    {
        return _costOfNDots(oracleAddress, endpoint, start, 0);
    }

    /// @dev calculates cost of n dots
    /// @param oracleAddress oracle address
    /// @param endpoint oracle endpoint
    /// @param start nth dot to start calculating price at
    /// @param nDots to bond
    /// @return cost of next dot
    function _costOfNDots(
        address oracleAddress,
        bytes32 endpoint,
        uint256 start,
        uint256 nDots
    )
        public
        view
        returns (uint256 cost)
    {


        uint256 length = registry.getProviderCurveLength(oracleAddress,endpoint);
        int[] memory curve = new int[](length);
        curve = registry.getProviderCurve(oracleAddress, endpoint);

        int res = PiecewiseLogic.evaluateFunction(curve, start, nDots);
        require(res >= 0, "Error: Cost of dots cannot be negative");
        return uint256(res);
    }

   function _dotLimit( 
        address oracleAddress,
        bytes32 endpoint
    )
        public
        view
        returns (uint256)
    {
        uint256 length = registry.getProviderCurveLength(oracleAddress,endpoint);
        int[] memory curve = new int[](length);
        curve = registry.getProviderCurve(oracleAddress, endpoint);

        return uint(curve[length-1]);
    }
}
