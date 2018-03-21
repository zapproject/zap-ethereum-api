Install project dependencies
 - Install nodejs and npm
 - Install truffle: npm install truffle
 - Install uuid-parse package: npm install uuid-parse
 - Install babel: npm install babel-core babel-cli babel-preset-env; npm install babel-polyfill
 - Create file .babelrc in root directory and paste into it: { "presets": ["env"] }
 - Install chai: npm install chai; npm install chai-bignumber; npm install chai-as-promised

To run tests
 - Start development blockchain: truffle develop
 - Start all tests: test
 - Start specified test file: test filename.js

Software versions
 - Solidity v0.4.17
 - Truffle v4.0.5
 - Chai
 - Babel
 
![ZAP DFD](https://github.com/zapproject/FeedArbitration/blob/master/dataflow.png)

### Security and Liability

All contracts are WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

v0.1
