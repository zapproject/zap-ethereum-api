pragma solidity ^0.4.18;

import "./interface/LibInterface.sol";

library TestLib {

    /// @dev Get the current cost of a dot.
    /// Endpoint specified by specifier.
    /// Data-provider specified by oracleAddress,
    function currentCostOfDot(
        uint _totalBound,
        LibInterface.ZapCurveType curveType,
        uint curveStart,
        uint curveMultiplier
    )
    public
    view
    returns (uint _cost)
    {
       return 88;
    }

    //log based 2 taylor series in assembly
    function fastlog2(uint x) public pure returns (uint y) {
       return 0;
    }
}
