pragma solidity ^0.4.24;

library PiecewiseLogic {
    /// @dev choose needed function piece and calculate it
    /// @param constants flattened array of all coefficients/powers/function across all polynomial terms, [c0,p0,fn0, c1,p1,fn1 ...]
    /// @param parts array of starting/ending points for piecewise function pieces [start0,end0,start1,end1...]
    /// @param dividers array of indices, each specifying range of indices in coef, power, fn belonging to each piece
    /// @param x currently bound dots
    /// @return chosen piece result
    function evalutePiecewiseFunction(int[] constants, uint[] parts, uint[] dividers, uint x) internal pure returns (int) {
        for ( uint i = 0; i < dividers.length; i++ ) {
            // Check start range
            uint start = parts[2 * i];

            if ( x < start ) {
                continue;
            }

            // Check the end range
            uint end = parts[(2 * i) + 1];

            if ( x > end ) {
                continue;
            }

            // Calculate sum
            int sum = 0;
            uint pStart = i == 0 ? 0 : dividers[i - 1];

            for ( uint j = pStart; j < dividers[i]; j++ ) {
                // Get the components
                int coef = constants[(3 * j)];
                int power = constants[(3 * j)+1];
                int fn = constants[(3 * j)+2];

                // Calculate the exponential in constant time
                assembly {
                    let _x := x

                    switch fn
                        // Fast Log2 calculation
                        case 1 {
                            _x := sub(_x, 1)
                            _x := or(_x, div(_x, 0x02))
                            _x := or(_x, div(_x, 0x04))
                            _x := or(_x, div(_x, 0x10))
                            _x := or(_x, div(_x, 0x100))
                            _x := or(_x, div(_x, 0x10000))
                            _x := or(_x, div(_x, 0x100000000))
                            _x := or(_x, div(_x, 0x10000000000000000))
                            _x := or(_x, div(_x, 0x100000000000000000000000000000000))
                            _x := add(_x, 1)
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
                            let y := div(mload(add(m, sub(255, div(mul(_x, 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff), 0x100000000000000000000000000000000000000000000000000000000000000)))), 0x100000000000000000000000000000000000000000000000000000000000000)
                            y := add(y, mul(256, gt(_x, 0x8000000000000000000000000000000000000000000000000000000000000000)))
                            _x := y
                        }
                        default {}

                    // sum += (_x ** power) * coef
                    sum := add(sum, mul(exp(_x, power), coef))
                }
            }

            return sum;
        }

        return 0;
    }
}
