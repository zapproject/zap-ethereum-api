pragma solidity ^0.4.14;

contract ZapRegistry {
    struct ZapOracle {
        uint256 public_key;                  // Public key of the user
        uint256[] route_keys;                // IPFS routing/other
        string title;                        // Tags (csv)
        mapping(bytes32 => ZapCurve) curves; // Price vs Supply (contract endpoint)
   }

    enum ZapCurveType {
        ZapCurveNone,
        ZapCurveLinear,
        ZapCurveExponential,
        ZapCurveLogarithmic
    }

    struct ZapCurve {
        ZapCurveType curveType;
        uint256 curveStart;
        uint256 curveMultiplier;
    }

    mapping(address => ZapOracle) oracles;

    function ZapRegistry() public {

    }

    function initiateProvider(uint256 public_key,
                              uint256[] ext_info,
                              string title)
                              public {
        oracles[msg.sender] = ZapOracle(
            public_key,
            ext_info,
            title
        );
    }

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

    function getProviderRouteKeys(address provider)
                                  public
                                  view
                                  returns(uint256[]) {
        return oracles[provider].route_keys;
    }

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
