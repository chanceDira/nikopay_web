// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TestUsdt} from "../src/TestUsdt.sol";

contract Mint is Script {
    function run(address token, address to, uint256 amount) external {
        vm.startBroadcast();
        TestUsdt(token).mint(to, amount);
        console2.log("minted", amount);
        console2.log("to", to);
        vm.stopBroadcast();
    }
}
