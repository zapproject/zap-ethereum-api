pragma solidity ^0.4.19;

import "../lib/Destructible.sol";
import "../lib/PiecewiseStorage.sol";

contract RegistryStorage is Ownable {

    // fundamental account type for the platform
    struct Oracle {
        uint256 publicKey;                               // Public key of the data provider
        bytes32 title;                                   // Tags (csv)
        mapping(bytes32 => bytes32[]) endpointParams;    // Endpoint specific parameters
        mapping(bytes32 => PiecewiseStorage.PiecewiseFunction) curves; // Price vs Supply (contract endpoint)
    }

    mapping(address => Oracle) private oracles;
    address[] private oracleIndex;

    /**** Get Methods ****/

    function getPublicKey(address provider) external view returns (uint256) {
        return oracles[provider].publicKey;
    }

    function getTitle(address provider) external view returns (bytes32) {
        return oracles[provider].title;
    }

    function getEndpointIndexSize(address provider, bytes32 endpoint) external view returns (uint256) {
        return oracles[provider].endpointParams[endpoint].length;
    }    

    function getEndPointParam(address provider, bytes32 endpoint, uint256 index) external view returns (bytes32) {
        return oracles[provider].endpointParams[endpoint][index];
    }

    function getCurveUnset(address provider, bytes32 endpoint) view returns (bool) {
        return oracles[provider].curves[endpoint].isInitialized == false;
    }

    function getCurvePiecesLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint64)
    {
        return oracles[provider].curves[endpoint].piecesLength;
    }

    function getCurveDividersLength(address provider, bytes32 endpoint)
        external
        view
        returns (uint64)
    {
        return oracles[provider].curves[endpoint].dividersLength;
    }

    function getCurveDivider(address provider, bytes32 endpoint, uint64 dividerNum)
        external
        view
        returns (uint)
    {
        return oracles[provider].curves[endpoint].dividers[dividerNum];
    }

    function getCurvePieceInfo(address provider, bytes32 endpoint, uint64 pieceNum)
        external
        view
        returns (uint start, uint end, uint64 termsLength)
    {
        return (
            oracles[provider].curves[endpoint].pieces[pieceNum].start,
            oracles[provider].curves[endpoint].pieces[pieceNum].end,
            oracles[provider].curves[endpoint].pieces[pieceNum].termsLength
        );
    }

    function getCurveTerm(address provider, bytes32 endpoint, uint64 pieceNum, uint64 termNum)
        external
        view
        returns (int coef, int power, int fn)
    {
        return (
            oracles[provider].curves[endpoint].pieces[pieceNum].terms[termNum].coef,
            oracles[provider].curves[endpoint].pieces[pieceNum].terms[termNum].power,
            oracles[provider].curves[endpoint].pieces[pieceNum].terms[termNum].fn
        );
    }

    function getOracleIndexSize() external view returns (uint256) {
        return oracleIndex.length;
    }

    function getOracleAddress(uint256 index) external view returns (address) {
        return oracleIndex[index];
    }

    /**** Set Methods ****/

    function createOracle(address origin, uint256 publicKey, bytes32 title) external onlyOwner {
        oracles[origin] = Oracle(publicKey, title);
    }

    function addOracle(address origin) external onlyOwner {
        oracleIndex.push(origin);
    }

    function setEndpointParameters(
        address origin,
        bytes32 endpoint,
        bytes32[] endpointParams
    )
        external
        onlyOwner

    {
        oracles[origin].endpointParams[endpoint] = endpointParams;
    }


    function setCurve(
        address origin,
        bytes32 endpoint
    ) 
        external
        onlyOwner
    {
        oracles[origin].curves[endpoint].isInitialized = true;
    }

    // TODO: rework push and pop functions to have possibility remove and add to any position

    function pushFunctionPiece(address origin, bytes32 endpoint, uint start, uint end) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        uint64 currentPiecesLength = pFunc.piecesLength;
        pFunc.pieces[currentPiecesLength].start = start;
        pFunc.pieces[currentPiecesLength].end = end;

        pFunc.piecesLength = pFunc.piecesLength + 1;
    }

    function pushFunctionDivider(address origin, bytes32 endpoint, uint divider) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        uint64 currentDividersLength = pFunc.dividersLength;
        pFunc.dividers[currentDividersLength] = divider;

        pFunc.dividersLength = pFunc.dividersLength + 1;
    }

    function pushPieceTerm(address origin, bytes32 endpoint, uint64 pieceNum, int coef, int power, int fn) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        uint64 termsLength = pFunc.pieces[pieceNum].termsLength;
        pFunc.pieces[pieceNum].terms[termsLength].coef = coef;
        pFunc.pieces[pieceNum].terms[termsLength].power = power;
        pFunc.pieces[pieceNum].terms[termsLength].fn = fn;

        pFunc.pieces[pieceNum].termsLength = pFunc.pieces[pieceNum].termsLength + 1;
    }

    function popFunctionPiece(address origin, bytes32 endpoint) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        require(pFunc.piecesLength > 0);

        pFunc.piecesLength = pFunc.piecesLength - 1;
    }

    function popFunctionDivider(address origin, bytes32 endpoint) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        require(pFunc.dividersLength > 0);

        pFunc.dividersLength = pFunc.dividersLength - 1;
    }

    function popPieceTerm(address origin, bytes32 endpoint, uint64 pieceNum) external onlyOwner {
        PiecewiseStorage.PiecewiseFunction storage pFunc = oracles[origin].curves[endpoint];
        require(pFunc.pieces[pieceNum].termsLength > 0);

        pFunc.pieces[pieceNum].termsLength = pFunc.pieces[pieceNum].termsLength - 1;
    }
}
