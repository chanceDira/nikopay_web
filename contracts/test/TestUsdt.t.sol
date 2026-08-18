// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
* @title TestUsdt test
* @author 0xJonaseb11
* @notice testing TestUsdt contract
 */

import {Test} from "forge-std/Test.sol";
import {TestUsdt} from "../src/TestUsdt.sol";

contract TestUsdtTest is Test {
    TestUsdt private token;
    address private alice = address(0xA11CE);

    function setUp() public {
        token = new TestUsdt();
    }

    function test_mintToCallerWallet() public {
        token.mint(alice, 1_000_000);
        assertEq(token.balanceOf(alice), 1_000_000);
        assertEq(token.totalSupply(), 1_000_000);
    }

    function test_transfer() public {
        token.mint(address(this), 1_000_000);
        bool ok = token.transfer(alice, 250_000);
        assertTrue(ok);
        assertEq(token.balanceOf(alice), 250_000);
        assertEq(token.balanceOf(address(this)), 750_000);
    }

    function test_revertMintIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(TestUsdt.NotOwner.selector);
        token.mint(alice, 1);
    }
}
