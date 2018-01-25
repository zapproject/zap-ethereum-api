pragma solidity ^0.4.14;

contract ZapRegistry {

    /*
        fundament account type for zap platform
    */
    struct ZapOracle {
        uint256 public_key;                  // Public key of the data provider
        uint256[] route_keys;                // IPFS routing/other
        string title;                        // Tags (csv)
        mapping(bytes32 => ZapCurve) curves; // Price vs Supply (contract endpoint)
   }

    /*
        enumeration of curve types representing dot(access token) prices as function of supply
    */
    enum ZapCurveType {
        ZapCurveNone,
        ZapCurveLinear,
        ZapCurveExponential,
        ZapCurveLogarithmic
    }

    /*
        curve data structure representing dot(access token) prices as function of supply
    */
    struct ZapCurve {
        ZapCurveType curveType;
        uint256 curveStart;
        uint256 curveMultiplier;
    }

    mapping(address => ZapOracle) oracles;

    function ZapRegistry() public { }

   /*
   Initiates a provider. 
    public key: unique id for provider. used for encyrpted key swap for subscription endpoints
    ext_into: endpoint specific params. TODO: update to bytes32[] endpoint params
    title: name
    
    if no address->ZapOracle mapping exists, ZapOracle object is created

   */ 
    function initiateProvider(uint256 public_key,
                              uint256[] ext_info,
                              string title)
                              public {
        if(oracles[msg.sender] == 0){
            oracles[msg.sender] = ZapOracle(
            public_key,
            ext_info,
            title
            );

        }
    }

    /*
    Initiates an endpoint specific provider curve
        specifier: specifier of endpoint. currently "smart_contract" or "socket_subscription"
        curveType: dot-cost vs oracle-specific dot-supply
        curveStart: y-offset of cost( always initial cost )
        curveMultiplier: coefficient to curveType

        if oracle[specfifier] is uninitialized, ZapCurve is mapped to specifier

    */

    function initiateProviderCurve(bytes32 specifier,
                                   ZapCurveType curveType,
                                   uint256 curveStart,
                                   uint256 curveMultiplier)
                                   public {
        // Must have previously initiated themselves
        require(oracles[msg.sender].public_key != 0);

        // Can't use a ZapCurveNone
        require(curveType != ZapCurveType.ZapCurveNone);

        // Can't reset their curve
        require(oracles[msg.sender].curves[specifier].curveType == ZapCurveType.ZapCurveNone);

        oracles[msg.sender].curves[specifier] = ZapCurve(
            curveType,
            curveStart,
            curveMultiplier
        );
    }


    /*
        return endpoint-specific params
    */

    function getProviderRouteKeys(address provider)
                                  public
                                  view
                                  returns(uint256[]) {
        return oracles[provider].route_keys;
    }


    /*
        return name
    */
    function getProviderTitle(address provider)
                              public
                              view
                              returns(string) {
        return oracles[provider].title;
    }

    function getProviderPublicKey(address provider)
                                  public
                                  view
                                  returns(uint256) {
        return oracles[provider].public_key;
    }
    /*
        get curve params
    */
    function getProviderCurve(address provider,
                              bytes32 specifier)
                              view
                              public
                              returns (
                                  ZapCurveType curveType,
                                  uint256 curveStart,
                                  uint256 curveMultiplier
                              ) {
        ZapCurve storage curve = oracles[provider].curves[specifier];

        return (
            curve.curveType,
            curve.curveStart,
            curve.curveMultiplier
        );
    }
}
