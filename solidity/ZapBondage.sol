pragma solidity ^0.4.14;

import "ZapRegistry.sol";

contract ERC20Basic {
    uint256 public totalSupply;
    function balanceOf(address who) public constant returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}
/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public constant returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

pragma solidity ^0.4.14;

contract ZapBondage {
    struct Holder {
        mapping (bytes32 => mapping(address => uint256)) bonds;
        mapping (address => bool) initialized;
        address[] oracleList;//for traversing
    }

    ZapRegistry registry;
    ERC20 token;
    uint public decimals = 10**16; //dealing in units of 1/100 zap

    address marketAddress;
    address dispatchAddress;


    mapping(address => Holder) holders;
    // (holder => (oracleAddress => (specifier => numEscrow)))
    mapping(address => mapping(address => mapping( bytes32 => uint256))) pendingEscrow;
    // (specifier=>(oracleAddress=>numZap)
    mapping(bytes32 => mapping(address=> uint)) public totalBound;


    modifier operatorOnly {
        if ( msg.sender == marketAddress || msg.sender == dispatchAddress ) {
            _;
        }
    }

    function ZapBondage(address tokenAddress, address registryAddress) public {
        token = ERC20(tokenAddress);
        registry = ZapRegistry(registryAddress);
    }

    function setMarketAddress(address _marketAddress) public {
        if (marketAddress == 0) {
            marketAddress = _marketAddress;
        }
    }

    function setDispatchAddress(address _dispatchAddress) public {
        if ( dispatchAddress == 0 ) {
            dispatchAddress = _dispatchAddress;
        }
    }

    function getZapBound(address oracleAddress,
                         bytes32 endpoint)
                         public
                         view
                         returns (uint256) {
        return totalBound[endpoint][oracleAddress];
    }

    // Transfer N dots from fromAddress to destAddress called only by the DisptachContract or MarketContract
    // In smart contract endpoint, occurs per satisfied request, in socket endpoint called on termination of subscription
    function transferDots(bytes32 specifier,
                          address holderAddress,
                          address oracleAddress,
                          uint256 numDots)
                          public operatorOnly {
        Holder storage holder = holders[oracleAddress];

        if ( numDots <= pendingEscrow[holderAddress][oracleAddress][specifier] ) {
            pendingEscrow[holderAddress][oracleAddress][specifier] -= numDots;

            if ( !holder.initialized[oracleAddress] ) {
                // Initialize uninitialized holder
                holder.initialized[oracleAddress] = true;
                holder.oracleList.push(oracleAddress);
            }

            holder.bonds[specifier][oracleAddress] += numDots;
        }
    }

    function escrowDots(bytes32 specifier, address holderAddress, address oracleAddress, uint256 numDots) 
    operatorOnly returns (bool success)  {
        
        uint currentDots = _getDots(specifier, holderAddress, oracleAddress);
        if(currentDots >= numDots){
            
            holders[holderAddress].bonds[specifier][oracleAddress]-=numDots;
            pendingEscrow[holderAddress][oracleAddress][specifier]+=numDots;
            return true;
        }
        else{
            return false;
        }
    }

    function unbond(bytes32 specifier,
                    uint numDots,
                    address oracleAddress)
                    public {
        _unbond(
            specifier,
            msg.sender,
            numDots,
            oracleAddress
        );
    }

    function _unbond(bytes32 specifier,
                     address holderAddress,
                     uint numDots,
                     address oracleAddress)
                     internal {
        Holder storage holder = holders[holderAddress];
        uint256 currentDots = holder.bonds[specifier][oracleAddress];

        if ( currentDots >= numDots ) {
            uint numZap = 0;
            uint localTotal = totalBound[specifier][oracleAddress];

            for ( uint i = 0; i < numDots; i++ ) {
                totalBound[specifier][oracleAddress] -= 1;
                holder.bonds[specifier][oracleAddress] -= 1;

                numZap += currentCostOfDot(
                    oracleAddress,
                    specifier,
                    localTotal
                );

                localTotal -= 1;
            }

            token.transfer(holderAddress, numZap*decimals);
        }
    }

    function bond(bytes32 specifier,
                  uint numZap,
                  address oracleAddress)
                  public {
        _bond(specifier, msg.sender, numZap, oracleAddress);
    }

    function _bond(bytes32 specifier,
                   address holderAddress,
                   uint numZap,
                   address oracleAddress)
                   internal {
        Holder storage holder = holders[holderAddress];

        if ( !holder.initialized[oracleAddress] ) {
            // Initialize uninitialized holder
            holder.initialized[oracleAddress] = true;
            holder.oracleList.push(oracleAddress);
        }

        uint numDots;
        (numZap, numDots) = calcZap(oracleAddress, specifier, numZap);

        // Move zap user must have approved contract to transfer workingZap
        if ( !token.transferFrom(msg.sender, this, numZap * decimals) ) {
            revert();
        }

        holder.bonds[specifier][oracleAddress] += numDots;
        totalBound[specifier][oracleAddress] += numZap;
    }

    function calcZapForDots(        
        bytes32 specifier, 
        uint numDots,
        address oracleAddress) public constant returns(uint256 _numZap){
            
        uint256 localTotal = totalBound[specifier][oracleAddress];
        uint256 numZap;
        for(uint i=0; i<numDots; i++){
            numZap += currentCostOfDot(
            oracleAddress,
            specifier,
            localTotal+i
            );
        }
        return numZap;
    }

    function calcZap(address oracleAddress,
                     bytes32 specifier,
                     uint256 numZap)
                     public constant
                     returns(uint256 _numZap, uint256 _numDots) {
        uint infinity = 10;
        uint dotCost = 0;

        for ( uint numDots = 0; numDots < infinity; numDots++ ) {
            dotCost = currentCostOfDot(
                oracleAddress,
                specifier,
                (totalBound[specifier][oracleAddress] + numDots)
            );

            if ( numZap > dotCost ) {
                numZap -= dotCost;
            }
            else {
                return (numZap, numDots);
            }
        }
    }

    function currentCostOfDot(address oracleAddress,
                              bytes32 specifier,
                              uint _totalBound)
                              internal
                              constant
                              returns (uint _cost) {
        var (curveTypeIndex, curveStart, curveMultiplier) = registry.getProviderCurve(oracleAddress, specifier);
        ZapRegistry.ZapCurveType curveType = ZapRegistry.ZapCurveType(curveTypeIndex);

        uint cost = 0;

        if ( curveType == ZapRegistry.ZapCurveType.ZapCurveLinear ) {
            cost = curveMultiplier * _totalBound + curveStart;
        }
        else if ( curveType == ZapRegistry.ZapCurveType.ZapCurveExponential ) {

            cost = curveMultiplier * (_totalBound ** 2) + curveStart;
        }
        else if ( curveType == ZapRegistry.ZapCurveType.ZapCurveLogarithmic ) {
            if ( _totalBound == 0 ) {
                _totalBound = 1;
            }

            cost = curveMultiplier * fastlog2(_totalBound) + curveStart;
        }

        return cost;
    }


    function getDots(bytes32 specifier,
                     address oracleAddress)
                     public view returns(uint dots) {
        return _getDots(specifier, msg.sender, oracleAddress);
    }

    function _getDots(bytes32 specifier,
                      address holderAddress,
                      address oracleAddress)
                      view returns(uint dots) {
        return holders[holderAddress].bonds[specifier][oracleAddress];
    }

    // SPECTIAL CURVES
    function fastlog2(uint x) public pure returns (uint y) {
       assembly {
            let arg := x
            x := sub(x,1)
            x := or(x, div(x, 0x02))
            x := or(x, div(x, 0x04))
            x := or(x, div(x, 0x10))
            x := or(x, div(x, 0x100))
            x := or(x, div(x, 0x10000))
            x := or(x, div(x, 0x100000000))
            x := or(x, div(x, 0x10000000000000000))
            x := or(x, div(x, 0x100000000000000000000000000000000))
            x := add(x, 1)
            let m := mload(0x40)
            mstore(m,           0xf8f9cbfae6cc78fbefe7cdc3a1793dfcf4f0e8bbd8cec470b6a28a7a5a3e1efd)
            mstore(add(m,0x20), 0xf5ecf1b3e9debc68e1d9cfabc5997135bfb7a7a3938b7b606b5b4b3f2f1f0ffe)
            mstore(add(m,0x40), 0xf6e4ed9ff2d6b458eadcdf97bd91692de2d4da8fd2d0ac50c6ae9a8272523616)
            mstore(add(m,0x60), 0xc8c0b887b0a8a4489c948c7f847c6125746c645c544c444038302820181008ff)
            mstore(add(m,0x80), 0xf7cae577eec2a03cf3bad76fb589591debb2dd67e0aa9834bea6925f6a4a2e0e)
            mstore(add(m,0xa0), 0xe39ed557db96902cd38ed14fad815115c786af479b7e83247363534337271707)
            mstore(add(m,0xc0), 0xc976c13bb96e881cb166a933a55e490d9d56952b8d4e801485467d2362422606)
            mstore(add(m,0xe0), 0x753a6d1b65325d0c552a4d1345224105391a310b29122104190a110309020100)
            mstore(0x40, add(m, 0x100))
            let magic := 0x818283848586878898a8b8c8d8e8f929395969799a9b9d9e9faaeb6bedeeff
            let shift := 0x100000000000000000000000000000000000000000000000000000000000000
            let a := div(mul(x, magic), shift)
            y := div(mload(add(m,sub(255,a))), shift)
            y := add(y, mul(256, gt(arg, 0x8000000000000000000000000000000000000000000000000000000000000000)))
        }
    }
}
