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

    function evaluateFunction(int[] curve, uint a, uint b) internal pure returns (uint) {
        uint i=0;
        
        // require to be within the dot limit
        require(a+b <= uint(curve[curve.length-1]));
        // loop invariant: i should always point to the start of a piecewise piece (the length)
        while(i < curve.length){
            uint l = uint(curve[i]);
            uint end = uint(curve[i + l + 1]);

            // index of the next piece
            uint nextIndex = i + l + 2;

            if (a > end) { // move on to the next piece
                i = nextIndex;
                continue;
            }

            if(a + b <= end){
                // entire calculation is within this piece
                return evaluatePiece(curve, i, a, b);
            } else {
                // TODO: calculation is going to be in multiple pieces


            }
        }
    }

    function evaluatePiece(int[] curve, uint index, uint a, uint b) internal pure returns (uint){
        int sum = 0;
        uint pow = 0;
        uint pieceEndIndex = index+uint(curve[index]); // index of last term
        // iterate between index+1 and the end of this piece
        for(uint i=index+1; i<=pieceEndIndex; i++){
            sum += curve[i] * int(sumOfPowers(a+b, pow));
            sum -= curve[i] * int(sumOfPowers(a-1, pow)); 
            pow++;
        }
        require(sum >= 0);
        return uint(sum);
    }
}
