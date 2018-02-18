pragma solidity ^0.4.17;

contract ZapRegistryInterface {
    function getProviderCurve(address provider, bytes32 specifier) view public returns (Functions.ZapCurveType curveType, uint256 curveStart, uint256 curveMultiplier);
}

contract Ownable {
    address public owner;
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner);

    /// @dev Set the original `owner` of the contract to the sender account
    function Ownable() { owner = msg.sender; }

    /// @dev Throws if called by any account other than the owner
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /// @dev Transfers control of the contract to a newOwner
    /// @param newOwner The address to transfer ownership to
    function transferOwnership(address newOwner) onlyOwner public {
        require(newOwner != address(0));
        OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}


contract Functions is Ownable {
    // Enumeration of curve types 
    // representing dot(access token) prices as function of supply
    enum ZapCurveType {
        ZapCurveNone,
        ZapCurveLinear,
        ZapCurveExponential,
        ZapCurveLogarithmic
    }

    // Curve data structure 
    // representing dot(access token) prices as function of supply
    struct ZapCurve {
        ZapCurveType curveType;
        uint256 curveStart;
        uint256 curveMultiplier;
    }

    ZapRegistryInterface registry;

    function Functions(ZapRegistryInterface _registryAddress) {
        registry = ZapRegistryInterface(_registryAddress);
    }

    function setRegistryAddress(address _registry) onlyOwner {
        registry = ZapRegistryInterface(_registry);
    }

    /// @dev Get the current cost of a dot.
    /// Endpoint specified by specifier.
    /// Data-provider specified by oracleAddress,
    function currentCostOfDot(
        address oracleAddress,
        bytes32 specifier,
        uint _totalBound
    )
        public
        view
        returns (uint _cost)
    {
        var (curveTypeIndex, curveStart, curveMultiplier) = registry.getProviderCurve(oracleAddress, specifier);
        ZapCurveType curveType = ZapCurveType(curveTypeIndex);

        require(curveType != ZapCurveType.ZapCurveNone);

        uint cost = 0;

        if (curveType == ZapCurveType.ZapCurveLinear) {
            cost = curveMultiplier * _totalBound + curveStart;
        } else if (curveType == ZapCurveType.ZapCurveExponential) {
            cost = curveMultiplier * (_totalBound ** 2) + curveStart;
        } else if (curveType == ZapCurveType.ZapCurveLogarithmic) {
            if (_totalBound == 0)
                _totalBound = 1;
            cost = curveMultiplier * fastlog2(_totalBound) + curveStart;
        }
        return cost;
    }

    //log based 2 taylor series in assembly
    function fastlog2(uint x) public pure returns (uint y) {
        assembly {
            let arg := x
            x := sub(x, 1)
            x := or(x, div(x, 0x02))
            x := or(x, div(x, 0x04))
            x := or(x, div(x, 0x10))
            x := or(x, div(x, 0x100))
            x := or(x, div(x, 0x10000))
            x := or(x, div(x, 0x100000000))
            x := or(x, div(x, 0x10000000000000000))
            x := or(x, div(x, 0x100000000000000000000000000000000))
            x := add(x, 1)
            let m := mload(0x40)
            mstore(m, 0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
            mstore(add(m, 0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
            mstore(add(m, 0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
            mstore(add(m, 0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
            mstore(add(m, 0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
            mstore(add(m, 0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
            mstore(add(m, 0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
            mstore(add(m, 0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
            mstore(0x40, add(m, 0x100))
            let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
            let shift := 0x100000000000000000000000000000000000000000000000000000000000000
            let a := div(mul(x, magic), shift)
            y := div(mload(add(m, sub(255, a))), shift)
            y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }
}

