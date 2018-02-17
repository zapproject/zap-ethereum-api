pragma solidity ^0.4.17;

import "./library/FunctionsAdmin.sol";

contract ZapRegistry is FunctionsAdmin {

    // fundamental account type for zap platform
    struct ZapOracle {
        uint256 public_key;                                     // Public key of the data provider
        uint256[] route_keys;                                   // IPFS routing/other
        string title;                                           // Tags (csv)
        mapping(bytes32 => FunctionsInterface.ZapCurve) curves; // Price vs Supply (contract endpoint)
    }

    mapping(address => ZapOracle) oracles;
    address[] oracleIndex;

    function ZapRegistry() public {}

    /// @dev Initiates a provider.
    /// If no address->ZapOracle mapping exists, ZapOracle object is created.
    /// @param public_key unique id for provider. Used for encyrpted key swap for subscription endpoints.
    /// @param ext_info endpoint specific params. TODO: update to bytes32[] endpoint params
    /// @param title name
    function initiateProvider(
        uint256 public_key,
        uint256[] ext_info,
        string title
    )
        public
    {
        if(oracles[msg.sender].public_key == 0) {
            oracles[msg.sender] = ZapOracle(
                public_key,
                ext_info,
                title
            );
            oracleIndex.push(msg.sender);
        }
    }

    /// @dev Initiates an endpoint specific provider curve.
    /// If oracle[specfifier] is uninitialized, ZapCurve is mapped to specifier.
    /// @param specifier specifier of endpoint. Currently "smart_contract" or "socket_subscription".
    /// @param curveType dot-cost vs oracle-specific dot-supply
    /// @param curveStart y-offset of cost( always initial cost )
    /// @param curveMultiplier coefficient to curveType
    function initiateProviderCurve(
        bytes32 specifier,
        FunctionsInterface.ZapCurveType curveType,
        uint256 curveStart,
        uint256 curveMultiplier
    )
        public
    {
        // Must have previously initiated themselves
        require(oracles[msg.sender].public_key != 0);

        // Can't use a ZapCurveNone
        require(curveType != FunctionsInterface.ZapCurveType.ZapCurveNone);

        // Can't reset their curve
        require(oracles[msg.sender].curves[specifier].curveType 
            == FunctionsInterface.ZapCurveType.ZapCurveNone
        );

        oracles[msg.sender].curves[specifier] = (
            FunctionsInterface.ZapCurve(
                curveType,
                curveStart,
                curveMultiplier
            )
        );
    }

    /// @return endpoint-specific params
    function getProviderRouteKeys(address provider)
        public
        view
        returns (uint256[]) 
    {
        return oracles[provider].route_keys;
    }

    /// @return oracle name
    function getProviderTitle(address provider)
        public
        view
        returns (string) 
    {
        return oracles[provider].title;
    }

    function getProviderPublicKey(address provider)
        public
        view
        returns (uint256)
    {
        return oracles[provider].public_key;
    }
    
    /// @dev Get curve paramaters from oracle
    function getProviderCurve(
        address provider,
        bytes32 specifier
    )
        view
        public
        returns (
            FunctionsInterface.ZapCurveType curveType,
            uint256 curveStart,
            uint256 curveMultiplier
        )
    {
        FunctionsInterface.ZapCurve storage curve = oracles[provider].curves[specifier];

        return (
            curve.curveType,
            curve.curveStart,
            curve.curveMultiplier
        );
    }

    function getNextProvider(uint256 index)
        view 
        returns (
            uint256 nextIndex,
            address oracleAddress,
            uint256 public_key,
            string title
        )
    {
        
        if(index < oracleIndex.length) {
            if(index + 1 < oracleIndex.length) {
                return (
                    index + 1, 
                    oracleIndex[index], 
                    oracles[oracleIndex[index]].public_key, 
                    oracles[oracleIndex[index]].title
                );            
            }
            
            return (
                0,
                oracleIndex[index],
                oracles[oracleIndex[index]].public_key,
                oracles[oracleIndex[index]].title
            );
        }
        
        return(0,0x0,0,"");
    }
}
