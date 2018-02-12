exports.CurveTypes = {
    "None": 0,
    "Linier": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}

exports.DECIMALS = 1000000000000000000;

exports.fetchPureArray = function (res, parseFunc) {
    let arr = [];
    for (let key in res) {
        arr.push(parseFunc(res[key].valueOf()));
    }
    return arr;
}

exports.calculateZapWithLinierCurve = function (dotsRequired, startValue, multiplier) {
    let zap = 0;
    for (i = 0; i < dotsRequired; i++) {
        zap += multiplier * i + startValue
    }
    return zap;
}