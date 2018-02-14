module.exports = {
    //fetchPureArray: fetchPureArray,
    showReceivedEvents: showReceivedEvents
};

// var fetchPureArray = (res, parseFunc) => {
//     let arr = [];
//     for (let key in res) {
//         arr.push(parseFunc(res[key].valueOf()));
//     }
//     return arr;
// };

var showReceivedEvents = (res) => {
    for (var i = 0; i < bondRes.logs.length; i++) {
        var log = bondRes.logs[i];
        console.log("Event ", log.event);
        for (var j = 0; j < log.args.length; j++) {
            let arg = log.args[j];
            console.log("   ", arg);
        }
    }
};

