var ProxyDispatcher = artifacts.require("./library/ProxyDispatcher.sol");
var ProxyDispatcherStorage = artifacts.require("./library/ProxyDispatcherStorage.sol");
var FunctionsLib = artifacts.require("./library/FunctionsLib.sol");


module.exports = function(deployer) {
    deployer.deploy(FunctionsLib).then(function() {
        return deployer.deploy(ProxyDispatcherStorage, FunctionsLib.address).then(function(res) {
            ProxyDispatcher.unlinked_binary = ProxyDispatcher.unlinked_binary.replace('1111222233334444555566667777888899990000',
                ProxyDispatcherStorage.address.slice(2));
            return deployer.deploy(ProxyDispatcher);
        });
    });
};