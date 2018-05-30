pragma solidity ^0.4.21;


/// coef flattened array of all coefficients across all polynomial terms
/// power flattened array of all powers across all polynomial terms
/// fn flattened array of all function indices across all polynomial terms
/// starts array of starting points for piecewise function pieces
/// ends array of ending points for piecewise function pieces
/// dividers array of indices, each specifying range of indices in coef,power,fn belonging to each piece
library PiecewiseStorage {

    struct PiecewiseTerm {
        int coef;
        int power;
        int fn;
    }

    struct PiecewisePiece {
        mapping (uint64 => PiecewiseTerm) terms;
        uint64 termsLength;
        uint start;
        uint end;
    }

    struct PiecewiseFunction {
        mapping (uint64 => PiecewisePiece) pieces;
        mapping (uint64 => uint) dividers;
        uint64 piecesLength;
        uint64 dividersLength;
        bool isInitialized;
    }
}
