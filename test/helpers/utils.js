exports.CurveTypes = {
    "Absolute": 0,
    "Logarithmic": 1
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

exports.structurizeCurve = function (parts) {
    const pieces = Array();

    let index = 0;
    let start = 1;

    while ( index < parts.length ) {
        const length = parts[index];
        const base = index + 1;
        const terms = parts.slice(base, base + length);
        const end = parts[base + length];

        pieces.push({
            terms,
            start,
            end
        });

        index = base + length + 1;
        start = end;
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

    for (let i = 1; i <= numDots; i++) {
        cost += exports.calcNextDotCost(structurizedCurve, i);
    }

    return cost;
};

function _calculatePolynomial(terms, x) {
    let sum = 0;

    for (let i = 0; i < terms.length; i++ ) {
        sum += terms[i] * (x ** i);
    }

    return sum;
}
