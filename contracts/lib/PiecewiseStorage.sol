pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

library PiecewiseStorage {

    struct PiecewiseTerm {
        int coef;
        int power;
        int fn;
    }

    struct PiecewisePolynomial {
        PiecewiseTerm[3] terms;
    }

    struct PiecewisePiece {
        PiecewisePolynomial poly;
        uint start;
        uint end;
    }

    struct PiecewiseFunction {
        PiecewisePiece[3] pieces;
    }


    function decodeCurve(int[] coef,
                         int[] power,
                         int[] fn,
                         uint[] parts,
                         uint[] dividers,
                         PiecewiseStorage.PiecewiseFunction storage out) internal {
        uint pStart = 0;

        // out.pieces = new PiecewiseStorage.PiecewisePiece[](dividers.length + 1);

        for ( uint i = 0; i < dividers.length; i++ ) {
            // PiecewiseStorage.PiecewiseTerm[] memory terms = new PiecewiseStorage.PiecewiseTerm[](10);

            out.pieces[i].start = parts[2 * i];
            out.pieces[i].end = parts[(2 * i) + 1];

            for ( uint j = pStart; j < dividers[i]; j++ ) {
                out.pieces[i].poly.terms[j - dividers[i]].coef = coef[j];
                out.pieces[i].poly.terms[j - dividers[i]].power = power[j];
                out.pieces[i].poly.terms[j - dividers[i]].fn = fn[j];
            }

            pStart = dividers[i];
        }
       
        // PiecewiseStorage.PiecewiseFunction memory out = PiecewiseStorage.PiecewiseFunction(pieces);

        // return pieces;
    }
}
