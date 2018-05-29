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
        int[25] memory coef;
        int[25] memory power;
        int[25] memory fn;
        uint[5] memory starts;
        uint[5] memory ends;
        uint[5] memory dividers;

        (coef, power, fn, starts, ends, dividers) = registry.getProviderCurve(oracleAddress, endpoint);

        PiecewiseStorage.PiecewiseFunction memory s;

        s = PiecewiseStorage.decodeCurve(
            coef, power, fn, starts, ends, dividers
        );

        return uint256(PiecewiseLogic.evalutePiecewiseFunction(
            s,
            int(totalBound)
        ));
    }
}
