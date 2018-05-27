pragma solidity ^0.4.19;

import "../../lib/Destructible.sol";
import "../../lib/PiecewiseStorage.sol";
import "../../lib/PiecewiseLogic.sol";
import "../../registry/RegistryInterface.sol";

contract CurrentCost is Destructible {

    RegistryInterface registry;

    function CurrentCost(address registryAddress) public {
       registry = RegistryInterface(registryAddress);
    }

    function _currentCostOfDot(
        address oracleAddress,
        bytes32 endpoint,
        uint256 totalBound
    )
        public
        view
        returns (uint256 cost)
    {
        return uint256(PiecewiseLogic.evalutePiecewiseFunction(
            PiecewiseStorage.decodeCurve(
                registry.getProviderCurve(oracleAddress, endpoint)
            ),
            int(totalBound)
        ));
    }
}
