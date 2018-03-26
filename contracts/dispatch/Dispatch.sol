pragma solidity ^0.4.21;
// v1.0

import "../aux/Mortal.sol";
import "../aux/update/Updatable.sol";
import "../aux/Client.sol";
import "../aux/addressSpace/AddressSpace.sol";
import "../aux/addressSpace/AddressSpacePointer.sol";
import "../bondage/BondageInterface.sol"; 
import "./DispatchStorage.sol";

contract Dispatch is Mortal, Updatable { 

    //event data provider is listening for, containing all relevant request parameters
    event LogIncoming(
        uint256 indexed id,
        address indexed provider,
        address indexed recipient,
        string query,
        bytes32 endpoint,
        bytes32[] endpointParams
    );
    
    DispatchStorage stor;
    BondageInterface bondage;

    AddressSpacePointer pointer;
    AddressSpace addresses;

    address public storageAddress;

    function Dispatch(address pointerAddress, address _storageAddress, address bondageAddress) public {
        pointer = AddressSpacePointer(pointerAddress);
        storageAddress = _storageAddress;
        stor = DispatchStorage(storageAddress);
        bondage = BondageInterface(bondageAddress);
    }

    function updateContract() external {
        if (addresses != pointer.addresses()) addresses = AddressSpace(pointer.addresses());
        if (bondage != addresses.bondage()) bondage = BondageInterface(addresses.bondage());
    }

    /// @notice Escrow dot for oracle request
    /// @dev Called by user contract
    function query(
        address provider,           // data provider address
        string query,               // query string
        bytes32 endpoint,           // endpoint specifier ala 'smart_contract'
        bytes32[] endpointParams    // endpoint-specific params
    )
        external
        returns (uint256 id)
    {
        uint256 dots = bondage.getDots(msg.sender, provider, endpoint);

        if(dots >= 1) {
            //enough dots
            bondage.escrowDots(msg.sender, provider, endpoint, 1);
            id = uint256(keccak256(block.number, now, query, msg.sender));
            stor.createQuery(id, provider, msg.sender, endpoint);
            LogIncoming(id, provider, msg.sender, query, endpoint, endpointParams);
        }
    }

    /// @notice Transfer dots from Bondage escrow to data provider's Holder object under its own address
    /// @dev Called upon data-provider request fulfillment
    function fulfillQuery(uint256 id) internal returns (bool) {

        require(stor.getStatus(id) == DispatchStorage.Status.Pending);

        bondage.releaseDots(
            stor.getSubscriber(id),
            stor.getProvider(id),
            stor.getEndpoint(id),
            1
        );

        stor.setFulfilled(id);
        return true;
    }


    /// @dev Parameter-count specific method called by data provider in response
    function respond1(
        uint256 id,
        string response
    )
        external
        returns (bool)
    {
        if (stor.getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        Client1(stor.getSubscriber(id)).callback(id, response);
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond2(
        uint256 id,
        string response1,
        string response2
    )
        external
        returns (bool)
    {
        if (stor.getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        Client2(stor.getSubscriber(id)).callback(id, response1, response2);
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond3(
        uint256 id,
        string response1,
        string response2,
        string response3
    )
        external
        returns (bool)
    {
        if (stor.getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        Client3(stor.getSubscriber(id)).callback(id, response1, response2, response3);
    }

    /// @dev Parameter-count specific method called by data provider in response
    function respond4(
        uint256 id,
        string response1,
        string response2,
        string response3,
        string response4
    )
        external
        returns (bool)
    {
        if (stor.getProvider(id) != msg.sender || !fulfillQuery(id))
            revert();
        Client4(stor.getSubscriber(id)).callback(id, response1, response2, response3, response4);
    }
}

/*
/* For use in example contract, see TestSubscriber.sol
/*
/* When User Contract calls ZapDispatch.query(),
/* 1 oracle specific dot is escrowed by ZapBondage and Incoming event is emitted.
/*
/* When provider's client hears an Incoming event containing provider's address and responds,
/* the provider calls a ZapDispatch.respondX function corresponding to number of response params.
/*
/* Dots are moved from ZapBondage escrow to data-provider's bond Holder struct,
/* with data provider address set as self's address.
/* 
/* callback is called in User Contract 
/*/
