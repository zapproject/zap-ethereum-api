pragma solidity ^0.4.24;

library PiecewiseLogic {
    function sumOfPowers(uint256 n, uint256 i) internal pure returns (uint256) {
        require(i <= 6 && i >= 0);

        if ( i == 0 ) return n;
        if ( i == 1 ) return (n * (n + 1)) / 2;
        if ( i == 2 ) return (n * (n + 1) * (2 * n + 1)) / 6;
        if ( i == 3 ) return ((n * (n + 1)) / 2) ** 2;
        if ( i == 4 ) return (n * (n + 1) * (2 * n + 1) * (3 * n * n + 3 * n - 1)) / 30;
        if ( i == 5 ) return (n * (n + 1)) ** 2 * (2 * n ** 2 + 2 * n - 1);
        if ( i == 6 ) return (n * (n + 1) * (2 * n + 1) * (3 * n ** 4 + 6 * n ** 3 - 3 * n + 1)) / 42;

        // impossible
        return 0;
    }

    function fastPiecewiseFunction(int[] constants, uint[] parts, uint[] dividers, uint a, uint b) internal pure returns (uint) {
        uint sum = 0;
        uint i;

        for ( i = 0; i < constants.length; i += 3 ) {
            // Can't do the fast computation, do it manually.
            if ( constants[i + 1] >= 7 || constants[i + 2] != 0 ) {
                for ( uint x = a; x <= a + b; x++ ) {
                    sum += uint(evalutePiecewiseFunction(constants, parts, dividers, x));
                }

                return sum;
            }
        }

        for ( i = 0; i < dividers.length; i++ ) {
            uint start = parts[2 * i];

            if ( a < start  ) {
                continue;
            }

            uint end = parts[(2 * i) + 1];
            uint _b = b;

            if ( a + _b > end ) {
                _b = end - a;
            }

            for ( uint j = (i == 0 ? 0 : dividers[i - 1]); j < dividers[i]; j++ ) {
                // Get the components
                uint coef = uint(constants[(3 * j)]);
                uint power = uint(constants[(3 * j)+1]);
                
                sum += coef * (sumOfPowers(a + _b, power) - sumOfPowers(a - 1, power));
            }

            if ( a + b > end ) {
                a += end;
            }
            else {
                break;
            }
        }

        return sum;
    }    

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

            for ( uint j = (i == 0 ? 0 : dividers[i - 1]); j < dividers[i]; j++ ) {
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
