export function fetchPureArray(res, parseFunc) {
    let arr = [];
    for (let key in res) {
        arr.push(parseFunc(res[key].valueOf()));
    }
    return arr;
}

export function calculateZapWithLinierCurve(dotsRequired, startValue, multiplier) {
    let zap = 0;
    for (i = 0; i < dotsRequired; i++) {
        zap += multiplier * i + startValue
    }
    return zap;
}