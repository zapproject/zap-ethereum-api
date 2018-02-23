var ProxyDispatcher = artifacts.require("./library/ProxyDispatcher.sol");
var ProxyDispatcherStorage = artifacts.require("./library/ProxyDispatcherStorage.sol");
var FunctionsLib = artifacts.require("./library/FunctionsLib.sol");


module.exports = function(deployer) {
    deployer.deploy(FunctionsLib).then(function() {
        return deployer.deploy(ProxyDispatcherStorage, FunctionsLib.address).then(function() {
            return deployer.deploy(ProxyDispatcher, ProxyDispatcherStorage.address);
        });
    });
};