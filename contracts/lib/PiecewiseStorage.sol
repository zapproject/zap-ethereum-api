pragma solidity ^0.4.21;

library PiecewiseStorage {

    struct PiecewiseTerm {
        int coef;
        int power;
        int fn;
    }

    struct PiecewisePolynomial {
        PiecewiseTerm[5] terms;
    }

    struct PiecewisePiece {
        PiecewisePolynomial poly;
        uint start;
        uint end;
    }

    struct PiecewiseFunction {
        PiecewisePiece[5] pieces;
        uint[5] dividers;
    }


    function decodeCurve(int[25] coef,
                         int[25] power,
                         int[25] fn,
                         uint[5] starts,
                         uint[5] ends,
                         uint[5] dividers) internal pure returns (PiecewiseStorage.PiecewiseFunction) {
        uint pStart = 0;

        PiecewiseStorage.PiecewisePiece[5] memory pieces;

        for ( uint i = 0; i < dividers.length; i++ ) {
            uint pEnd = dividers[i];

            PiecewiseStorage.PiecewiseTerm[5] memory terms;

            for ( uint j = pStart; j < pEnd; j++ ) {
                terms[j - pStart].coef = coef[j];
                terms[j - pStart].power = power[j];
                terms[j - pStart].fn = fn[j];
            }

            PiecewiseStorage.PiecewisePolynomial memory poly = PiecewiseStorage.PiecewisePolynomial(terms);
            PiecewiseStorage.PiecewisePiece memory piece = PiecewiseStorage.PiecewisePiece(poly, starts[i], ends[i]);

            pieces[i] = piece;

            pStart = pEnd;
        }

        return PiecewiseStorage.PiecewiseFunction(pieces, dividers);
    }

}
