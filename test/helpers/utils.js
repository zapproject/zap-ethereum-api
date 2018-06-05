exports.CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponential": 2,
    "Logarithmic": 3
};

exports.DECIMALS = 1000000000000000000;

exports.ZeroAddress = "0x0000000000000000000000000000000000000000";

exports.fetchPureArray = function (res, parseFunc) {
    let arr = [];
    for (let key in res) {
        if (parseFunc != null) {
            arr.push(parseFunc(res[key].valueOf()));
        } else {
            arr.push(res[key].valueOf());
        }
    }
    return arr;
};


exports.structurizeCurve = function (constants, parts, dividers) {
    let pieces = Array();
    let pStart = 0;

    for (let i = 0; i < dividers.length; i++) {
        let piece = Object();
        piece.start = parts[2 * i];
        piece.end =  parts[(2 * i) + 1];
        piece.terms = Array();
        pieces.push(piece);

        for (let j = pStart; j < dividers[i]; j++) {
            let term = Object();
            term.coef = constants[(3 * j)];
            term.power = constants[(3 * j) + 1];
            term.fn = constants[(3 * j) + 2];

            pieces[i].terms.push(term);
        }

        pStart = dividers[i];
    }

    return pieces;
};

exports.calcNextDotCost = function (structurizedCurve, total) {
    if (total < 0) {
        return 0;
    }

    for (let i = 0; i < structurizedCurve.length; i++) {
        if (structurizedCurve[i].start <= total && total <= structurizedCurve[i].end) {
            return _calculatePolynomial(structurizedCurve[i].terms, total);
        }
    }

    return 0;
};

exports.calcDotsCost = function (structurizedCurve, numDots) {
    let cost = 0;
    for (let i = 0; i < numDots; i++) {
        cost += exports.calcNextDotCost(structurizedCurve, i);
    }

    return cost;
};

function _calculateTerm(term, x) {
    let val = 1;

    if (term.fn === 0) {
        if (x < 0) x = -x;
    }  else if (term.fn === 1) {
        if (x < 0) {
            x = 0;
        } else  {
            x = Math.round(Math.log2(x));
        }
    }

    if (term.power > 0) {
        val = Math.pow(x, term.power);
    }

    return val * term.coef;
}

function _calculatePolynomial(terms, x) {
    let sum = 0;

    for (let i = 0; i < terms.length; i++ ) {
        sum += _calculateTerm(terms[i], x);
    }

    return sum;
}