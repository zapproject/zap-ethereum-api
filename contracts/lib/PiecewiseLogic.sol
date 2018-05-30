import "./PiecewiseStorage.sol";
import "../registry/RegistryInterface.sol";

library PiecewiseLogic {

    enum PiecewiseTermFunc {
        TermAbs,
        TermLog,
        TermNone
    }

    function evaluatePiecewiseTerm(int coef, int power, int fn, int x) private pure returns (int) {
        int val = 1;

        if ( fn == 0 ) {
            if ( x < 0 ) x = -x;
        }
        else if ( fn == 1 ) {
            if ( x < 0 ) x = 0;
            else         x = int256(fastlog2(uint256(x)));
        }

        int exp = power;
        
        while ( exp > 0 ) {
            val *= x;
            exp--;
        }

        return exp * coef;
    }

    function evaluatePiecewisePolynomial(RegistryInterface reg, address oracle, bytes32 endpoint, uint64 pieceNum, uint64 termsLength, int x) private view returns (int) {
        int sum = 0;

        for ( uint64 i = 0; i < termsLength; i++ ) {
            int coef;
            int power;
            int fn;
            (coef, power, fn) = reg.getCurveTerm(oracle, endpoint, pieceNum, i);
            sum += evaluatePiecewiseTerm(coef, power, fn, x);
        }

        return sum;
    }

    function evalutePiecewiseFunction(RegistryInterface reg, address oracle, bytes32 endpoint, int x) internal view returns (int) {
        if ( x < 0 ) {
            revert();
        }

        uint256 _x = uint256(x);



        uint length = reg.getCurvePiecesLength(oracle, endpoint);
        for ( uint64 i = 0; i < length; i++ ) {
            uint start;
            uint end;
            uint64 termsLength;
            (start, end, termsLength) = reg.getCurvePieceInfo(oracle, endpoint, i);
            if ( start >= _x && _x <= end ) {
                return evaluatePiecewisePolynomial(reg, oracle, endpoint, i, termsLength, x);
            }
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

