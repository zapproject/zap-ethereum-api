pragma solidity ^0.4.19;

library PiecewiseLogic {


    struct PiecewiseTerm {
        int coef;
        int power;
        int fn;
    }

    struct PiecewisePiece {
        PiecewiseTerm[] terms;
        uint start;
        uint end;
    }
    struct PiecewiseFunction{
        PiecewisePiece[] pieces;
        int[] constants;
        uint[] parts;
        uint[] dividers;
    }

    function evaluatePiecewiseTerm(PiecewiseTerm term, int x) private pure returns (int) {
        int val = 1;

        if ( term.fn == 0 ) {
            if ( x < 0 ) x = -x;
        }
        else if ( term.fn == 1 ) {
            if ( x < 0 ) x = 0;
            else         x = int256(fastlog2(uint256(x)));
        }

        int exp = term.power;

        while ( exp > 0 ) {
            val *= x;
            exp--;
        }

        return val * term.coef;
    }

    function evaluatePiecewisePolynomial(PiecewiseTerm[] terms, int x) private pure returns (int) {
        int sum = 0;

        for ( uint i = 0; i < terms.length; i++ ) {
            sum += evaluatePiecewiseTerm(terms[i], x);
        }

        return sum;
    }

    function evalutePiecewiseFunction(int[] constants, uint[] parts, uint[] dividers, int x) internal pure returns (int) {
        if ( x < 0 ) {
            revert();
        }

        uint256 _x = uint256(x);

        uint pStart = 0;
        PiecewisePiece[] memory pieces;
        for ( uint i = 0; i < dividers.length; i++ ) {

            pieces[i].start = parts[2 * i];
            pieces[i].end = parts[(2 * i) + 1];

            for ( uint j = pStart; j < dividers[i]; j++ ) {
                pieces[i].terms[j - pStart].coef  = constants[(3 * j) + 0];
                pieces[i].terms[j - pStart].power = constants[(3 * j) + 1];
                pieces[i].terms[j - pStart].fn    = constants[(3 * j) + 2];
            }

            pStart = dividers[i];
        }

        for ( uint y = 0; y < pieces.length; y++ ) {
            if ( pieces[y].start >= _x && _x <= pieces[y].end ) {
                return evaluatePiecewisePolynomial(pieces[y].terms, x);
            }
            else return 0;
        }
    }

    function fastlog2(uint256 x) private pure returns (uint256 y) {
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
