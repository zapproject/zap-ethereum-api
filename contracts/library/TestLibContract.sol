pragma solidity ^0.4.18;

import "./interface/LibInterface.sol";

contract TestLibContract {
    function TestLibContract(){

    }

    function currentCostOfDot(uint _totalBound, LibInterface.ZapCurveType curveType, uint curveStart, uint curveMultiplier) public view returns (uint _cost) {
        return LibInterface.currentCostOfDot(_totalBound, curveType, curveStart, curveMultiplier);
    }

    function fastlog2(uint x) public pure returns (uint y) {
        return LibInterface.fastlog2(x);
    }
}
