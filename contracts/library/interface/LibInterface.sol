pragma solidity ^0.4.0;


library LibInterface {
    /*
          enumeration of curve types representing dot(access token) prices as function of supply
      */
    enum ZapCurveType {
    ZapCurveNone,
    ZapCurveLinear,
    ZapCurveExponential,
    ZapCurveLogarithmic
    }

    /*
        curve data structure representing dot(access token) prices as function of supply
    */
    struct ZapCurve {
    ZapCurveType curveType;
    uint256 curveStart;
    uint256 curveMultiplier;
    }

    /// @dev Get the current cost of a dot.
    /// Endpoint specified by specifier.
    /// Data-provider specified by oracleAddress,
    function currentCostOfDot(address oracleAddress, bytes32 specifier, uint _totalBound) public view returns (uint _cost);

    //log based 2 taylor series in assembly
    function fastlog2(uint x) public pure returns (uint y);
}
