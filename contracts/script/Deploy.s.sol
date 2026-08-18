// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TestUsdt} from "../src/TestUsdt.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        TestUsdt token = new TestUsdt();
        console2.log("TestUsdt", address(token));
        vm.stopBroadcast();
    }
}
