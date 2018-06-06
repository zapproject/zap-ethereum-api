pragma solidity ^0.4.19;

import "../../lib/Destructible.sol";
import "../../lib/PiecewiseLogic.sol";
import "../../registry/RegistryInterface.sol";

contract CurrentCost is Destructible {

    RegistryInterface registry;

    function CurrentCost(address registryAddress) public {
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

        return uint256(PiecewiseLogic.evalutePiecewiseFunction(constants,parts,dividers,
            int(totalBound)
        ));
    }
}
