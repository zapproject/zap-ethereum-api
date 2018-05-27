pragma solidity ^0.4.21;

library PiecewiseStorage {

    struct PiecewiseTerm {
        int coef;
        int power;
        int fn;
    }

    struct PiecewisePolynomial {
        PiecewiseTerm[] terms;
    }

    struct PiecewisePiece {
        PiecewisePolynomial poly;
        uint start;
        uint end;
    }

    struct PiecewiseFunction {
        PiecewisePiece[] pieces;
        uint[] dividers;
    }


    function decodeCurve(int[] coef,
                         int[] power,
                         int[] fn,
                         uint[] starts,
                         uint[] ends,
                         uint[] dividers) internal pure returns (PiecewiseStorage.PiecewiseFunction) {
        uint pStart = 0;

        PiecewiseStorage.PiecewisePiece[] memory pieces = new PiecewiseStorage.PiecewisePiece[](dividers.length + 1);

        for ( uint i = 0; i < dividers.length; i++ ) {
            uint pEnd = dividers[i];

            PiecewiseStorage.PiecewiseTerm[] memory terms = new PiecewiseStorage.PiecewiseTerm[](pEnd - pStart + 1);

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
