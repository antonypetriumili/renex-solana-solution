pragma solidity ^0.4.25;

import "republic-sol/contracts/RepublicToken.sol";
import "republic-sol/contracts/DarknodeRegistry.sol";
import "republic-sol/contracts/Orderbook.sol";
import "republic-sol/contracts/DarknodeRewardVault.sol";
import "republic-sol/contracts/Settlement.sol";
import "republic-sol/contracts/SettlementRegistry.sol";
import "republic-sol/contracts/DarknodeSlasher.sol";

import "./RenExAtomicSwapper.sol";
import "./RenExBalances.sol";
import "./RenExSettlement.sol";
import "./RenExTokens.sol";

/// @notice Bindings imports all of the contracts for generating the Go
/// bindings.
contract Bindings {
    // CONTRACT LEFT BLANK INTENTIONALLY
}
