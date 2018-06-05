pragma solidity ^0.4.24;

library PiecewiseStorage {

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


    /// @dev convert arrays to PiecewisePiece
    /// @param constants flattened array of all coefficients/powers/function across all polynomial terms, [c0,p0,fn0, c1,p1,fn1 ...]
    /// @param parts array of starting/ending points for piecewise function pieces [start0,end0,start1,end1...]
    /// @param dividers array of indices, each specifying range of indices in coef, power, fn belonging to each piece
    /// @param x currently bound dots
    function decodeCurve(int[] constants,
                         uint[] parts,
                         uint[] dividers,
                         PiecewiseStorage.PiecewisePiece[] storage out) internal {
        uint pStart = 0;

        for ( uint i = 0; i < dividers.length; i++ ) {

            out[i].start = parts[2 * i];
            out[i].end = parts[(2 * i) + 1];

            for ( uint j = pStart; j < dividers[i]; j++ ) {
                out[i].terms[j - pStart].coef  = constants[(3 * j) + 0];
                out[i].terms[j - pStart].power = constants[(3 * j) + 1];
                out[i].terms[j - pStart].fn    = constants[(3 * j) + 2];
            }

            pStart = dividers[i];
        }

    }
}
