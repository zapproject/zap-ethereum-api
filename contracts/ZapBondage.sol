pragma solidity ^0.4.17;

import "./ZapRegistry.sol";

contract ERC20Basic {
    uint256 public totalSupply;
    function balanceOf(address who) public constant returns (uint256);
    function transfer(address to, uint256 value) public returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

contract ERC20 is ERC20Basic {
    string public name;
    string public symbol;
    uint256 public decimals;
    function allowance(address owner, address spender) public constant returns (uint256);
    function transferFrom(address from, address to, uint256 value) public returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ZapBondage is FunctionsAdmin {
      
    //   data structure for holder of ZAP bond to data provider
    //   currently ONLY "smart_contract" or "socket_subscription"
    struct Holder {
        //endpoint specifier* => ( provider address => bond value)
        mapping (bytes32 => mapping(address => uint256)) bonds;
        //provider address => initialized flag
        mapping (address => bool) initialized;
        //for traversing
        address[] oracleList;
    }

    ZapRegistry registry;
    ERC20 token;
    uint public decimals = 10**18;

    address arbiterAddress;
    address dispatchAddress;

    mapping(address => Holder) holders;

    // (holder => (oracleAddress => (specifier => numEscrow)))
    mapping(address => mapping(address => mapping( bytes32 => uint256))) pendingEscrow;

    // (specifier=>(oracleAddress=>numZap)
    mapping(bytes32 => mapping(address=> uint)) totalBound;

    // (specifier=>(oracleAddress=>numDots)
    mapping(bytes32 => mapping(address=> uint)) totalIssued;


    // For restricting dot escrow/transfer method calls to ZapDispatch and ZapArbiter
    modifier operatorOnly {
        if ( msg.sender == arbiterAddress || msg.sender == dispatchAddress ) {
            _;
        }
    }

    /// @dev Initialize Token and ZapRegistry Contracts
    function ZapBondage(address tokenAddress, address registryAddress) public {
        token = ERC20(tokenAddress);
        registry = ZapRegistry(registryAddress);
    }

    /// @dev Set ZapArbiter address
    function setArbiterAddress(address _arbiterAddress) public {
        if (arbiterAddress == 0) {
            arbiterAddress = _arbiterAddress;
        }
    }

    /// @dev Set ZapDispatch address
    function setDispatchAddress(address _dispatchAddress) public {
        if (dispatchAddress == 0) {
            dispatchAddress = _dispatchAddress;
        }
    }

    /// @return total ZAP held by contract
    function getZapBound(address oracleAddress,
        bytes32 endpoint)
    public
    view
    returns (uint256) {
        return totalBound[endpoint][oracleAddress];
    }


    /// @dev Transfer N dots from fromAddress to destAddress. 
    /// Called only by the DisptachContract or ArbiterContract.
    /// In smart contract endpoint, occurs per satisfied request. 
    /// In socket endpoint called on termination of subscription.
    function releaseDots(
        bytes32 specifier,
        address fromProviderHolder,
        address toOracleHolder,
        uint256 numDots
    )
        public 
        operatorOnly 
    {
        Holder storage holder = holders[toOracleHolder];

        if (numDots <= pendingEscrow[fromProviderHolder][toOracleHolder][specifier]) {
            pendingEscrow[fromProviderHolder][toOracleHolder][specifier] -= numDots;

            if (!holder.initialized[toOracleHolder]) {
                // Initialize uninitialized holder
                holder.initialized[toOracleHolder] = true;
                holder.oracleList.push(toOracleHolder);
            }

            holder.bonds[specifier][toOracleHolder] += numDots;
        }
    }

    /// @dev Move numDots dots from provider-requester to bondage according to 
    /// data-provider address, holder address, and endpoint specifier (ala 'smart_contract')
    function escrowDots(
        bytes32 specifier,
        address holderAddress,
        address oracleAddress,
        uint256 numDots
    )
        operatorOnly
        public
        returns (bool success)  
    {

        uint currentDots = getDots(specifier, holderAddress, oracleAddress);
        if(currentDots >= numDots) {
            holders[holderAddress].bonds[specifier][oracleAddress] -= numDots;
            pendingEscrow[holderAddress][oracleAddress][specifier] += numDots;
            return true;
        }
            return false;
    }

    function unbond(
        bytes32 specifier,
        uint numDots,
        address oracleAddress
    )
        public 
    {
        _unbond(
            specifier,
            msg.sender,
            numDots,
            oracleAddress);
    }

    function _unbond(
        bytes32 specifier,
        address holderAddress,
        uint numDots,
        address oracleAddress
    )
        internal returns(bool success)
    {

        Holder storage holder = holders[holderAddress];

        //currentDots
        if (holder.bonds[specifier][oracleAddress] >= numDots && numDots > 0) {
            uint numZap = 0;
            uint localTotal = holder.bonds[specifier][oracleAddress];
            
            for (uint i = 0; i < numDots; i++) {

                localTotal -= 1;

                numZap += functions.currentCostOfDot(
                    oracleAddress,
                    specifier,
                    (totalIssued[specifier][oracleAddress]-1)
                );
                    
            }
            
            totalBound[specifier][oracleAddress] -= numZap;
            totalIssued[specifier][oracleAddress] -= numDots;
            
            holder.bonds[specifier][oracleAddress] = localTotal;
        
            if(token.transfer(holderAddress, numZap*decimals)){
                return true;
            }
            else{
                return false;
            }
        }
        return false;

    }

    function bond(
        bytes32 specifier,
        uint numZap,
        address oracleAddress
    )
        public 
        returns(uint256) 
    {
        _bond(specifier, msg.sender, numZap, oracleAddress);
    }

    function _bond(
        bytes32 specifier,
        address holderAddress,
        uint numZap,
        address oracleAddress
    )
        internal 
        returns(uint256) 
    {
        Holder storage holder = holders[holderAddress];

        if (!holder.initialized[oracleAddress]) {
            // Initialize uninitialized holder
            holder.initialized[oracleAddress] = true;
            holder.oracleList.push(oracleAddress);
        }

        uint numDots;
        (numZap, numDots) = calcZap(oracleAddress, specifier, numZap);

        // Move zap user must have approved contract to transfer workingZap
        require(token.transferFrom(msg.sender, this, numZap * decimals));

        holder.bonds[specifier][oracleAddress] += numDots;
        
        totalIssued[specifier][oracleAddress] += numDots;
        totalBound[specifier][oracleAddress] += numZap;

    }

    /// @dev Calculate quantity of ZAP token required for specified amount of dots
    /// for endpoint defined by specifier and data provider defined by oracleAddress
    function calcZapForDots(
        bytes32 specifier,
        uint numDots,
        address oracleAddress
    ) 
        public
        view
        returns (uint256 _numZap)
    {
        uint256 numZap;

        for (uint i = 0; i < numDots; i++) {
            numZap += functions.currentCostOfDot(
                oracleAddress,
                specifier,
                totalIssued[specifier][oracleAddress] + i);
        }
        return numZap;
    }

    /// @dev Calculate amount of dots which could be purchased with given numZap ZAP token 
    /// for endpoint specified by specifier and data-provider address specified by oracleAddress
    function calcZap(
        address oracleAddress,
        bytes32 specifier,
        uint256 numZap
    )
        public
        view
        returns (uint256 _numZap, uint256 _numDots) 
    {
        uint infinity = decimals;
        uint dotCost = 0;
        uint totalDotCost = 0;

        for (uint numDots = 0; numDots < infinity; numDots++) {
            dotCost = functions.currentCostOfDot(
                oracleAddress,
                specifier,
                (totalIssued[specifier][oracleAddress] + numDots));

            if (numZap >= dotCost) {
                numZap -= dotCost;
                totalDotCost += dotCost;
            } else {
                break;
            }
        }
        return (totalDotCost, numDots);
    }


    function getDotsIssued(
        bytes32 specifier,
        address oracleAddress
    )
        view
        public
        returns(uint dots)
    {
        return totalIssued[specifier][oracleAddress];
    }

    function getDots(
        bytes32 specifier,
        address holderAddress,
        address oracleAddress
    )
        view
        public
        returns (uint dots)
    {
        return holders[holderAddress].bonds[specifier][oracleAddress];
    }
}
