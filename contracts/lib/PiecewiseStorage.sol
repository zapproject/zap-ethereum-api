pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2;

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


    function decodeCurve(int[] constants,
                         uint[] parts,
                         uint[] dividers,
                         PiecewiseStorage.PiecewisePiece[] storage out) internal {
        uint pStart = 0;
        uint pieceLength = out.length;
        // out.pieces = new PiecewiseStorage.PiecewisePiece[](dividers.length + 1);

        for ( uint i = 0; i < dividers.length; i++ ) {
            // PiecewiseStorage.PiecewiseTerm[] memory terms = new PiecewiseStorage.PiecewiseTerm[](10);

            out[i].start = parts[2 * i];
            out[i].end = parts[(2 * i) + 1];

            for ( uint j = pStart; j < dividers[i]; j++ ) {
                out[i].terms[j - dividers[i]].coef  = constants[(pieceLength * j) + 0];
                out[i].terms[j - dividers[i]].power = constants[(pieceLength * j) + 1];
                out[i].terms[j - dividers[i]].fn    = constants[(pieceLength * j) + 2];
            }

            pStart = dividers[i];
        }

        // PiecewiseStorage.PiecewiseFunction memory out = PiecewiseStorage.PiecewiseFunction(pieces);

        // return pieces;
    }
}
