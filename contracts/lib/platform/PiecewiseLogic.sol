pragma solidity ^0.4.24;

library PiecewiseLogic {
    function sumOfPowers(uint n, uint i) internal pure returns (uint) {
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

    function evaluateFunction(int[] curve, uint a, uint b) internal pure returns (int) {
        uint i = 0;
        
        // Require to be within the dot limit
        require(a + b <= uint(curve[curve.length - 1]));

        // Loop invariant: i should always point to the start of a piecewise piece (the length)
        while ( i < curve.length ) {
            uint l = uint(curve[i]);
            uint end = uint(curve[i + l + 1]);

            // Index of the next piece's end
            uint nextIndex = i + l + 2;

            if ( a > end ) { // move on to the next piece
                i = nextIndex;
                continue;
            }

            if ( a + b <= end ) {
                // entire calculation is within this piece
                return evaluatePiece(curve, i, a, b);
            }
            else {
                // TODO: calculation is going to be in multiple pieces
                throw;

            }
        }
    }

    function evaluatePiece(int[] curve, uint index, uint a, uint b) internal pure returns (int){
        int sum = 0;
        uint len = uint(curve[index]);
        uint base = index + 1;
        uint end = base + len; // index of last term

        // iterate between index+1 and the end of this piece
        for ( uint i = base; i < end; i++ ) {
            sum += curve[i] * int(sumOfPowers(a + b, i - base) - sumOfPowers(a - 1, i - base));
        }

        require(sum >= 0);
        return sum;
    }
}
