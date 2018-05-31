pragma solidity ^0.4.19;
pragma experimental ABIEncoderV2;

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
        uint pieceLength = registry.getPieceLength(oracleAddress, endpoint);
        PiecewiseStorage.PiecewisePiece[] memory curve = new PiecewiseStorage.PiecewisePiece[](pieceLength);
        curve = registry.getProviderCurve(oracleAddress, endpoint);

        return uint256(PiecewiseLogic.evalutePiecewiseFunction(curve,
            int(totalBound)
        ));
    }
}
