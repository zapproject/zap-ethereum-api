const fs = require('fs');
const solc = require('solc');

// Compile the source code using solcjs
function compileContracts(source_files) {
    // Load the inputs
    const sources = {};

    for ( const file of source_files ) {
        sources[file] = fs.readFileSync(file).toString();
    }

    // Compile the input
    const output = solc.compile({
        sources: sources
    }, 1);

    const result = {};

    // Parse all compiled contracts
    for ( const k in  output.contracts ) {
        // Find which contract was compiled
        const contractKey = k.split(':').pop();
        const contract = output.contracts[k];

        // Get the bytecode and ABI
        const bytecode = contract.bytecode;
        const abi = JSON.parse(contract.interface);

        result[contractKey] = {
            bytecode: bytecode,
            abi: abi
        };
    }

    return result;
}

const results = compileContracts([
    "ZapArbiter.sol",
    "ZapBondage.sol",
    "ZapRegistry.sol",
    "ZapToken.sol"
]);

for ( const result in results ) {
    // Ignore irrelevant things
    if ( !result.startsWith("Zap") ) {
        continue;
    }

    console.log("Saving the", result, "ABI");
    fs.writeFileSync("abis/" + result + ".json", JSON.stringify(results[result].abi, 0, 4));
}
