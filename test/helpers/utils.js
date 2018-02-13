module.exports.fetchPureArray = function (res, parseFunc) {
    let arr = [];
    for (let key in res) {
        arr.push(parseFunc(res[key].valueOf()));
    }
    return arr;
}

module.exports.CurveTypes = {
    "None": 0,
    "Linear": 1,
    "Exponentioal": 2,
    "Logarithmic": 3
}