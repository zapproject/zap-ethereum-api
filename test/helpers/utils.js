exports.CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponential": 2,
    "Logarithmic": 3
}

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
}

exports.calculateTokWithLinearCurve = function (dotsRequired, startValue, multiplier) {
    let tok = 0;
    for (let i = 0; i < dotsRequired; i++) {
        tok += multiplier * i + startValue
    }
    return tok;
}

exports.calculateTokWithExponentialCurve = function (dotsRequired, startValue, multiplier) {
    let tok = 0;
    for (let i = 0; i < dotsRequired; i++) {
        tok += multiplier * Math.pow(i, 2) + startValue;
    }
    return tok;
}

exports.calculateTokWithLogarithmicCurve = function (dotsRequired, startValue, multiplier) {
    let tok = 0;
    for (let i = 0; i < dotsRequired; i++) {
        let totalBound = i;
        if (totalBound == 0) {
            totalBound = 1;
        }
        tok += multiplier * Math.log2(totalBound) + startValue;
    }
    return Math.ceil(tok);
}