import { BN } from "bn.js";

import * as testUtils from "./helper/testUtils";

import { settleOrders } from "./helper/settleOrders";
import { market, TOKEN_CODES } from "./helper/testUtils";

import { BrokerVerifierContract } from "./bindings/broker_verifier";
import { DarknodeRegistryContract } from "./bindings/darknode_registry";
import { OrderbookContract } from "./bindings/orderbook";
import { PreciseTokenContract } from "./bindings/precise_token";
import { RenExBalancesContract } from "./bindings/ren_ex_balances";
import { RenExBrokerVerifierContract } from "./bindings/ren_ex_broker_verifier";
import { RenExSettlementContract } from "./bindings/ren_ex_settlement";
import { RenExTokensContract } from "./bindings/ren_ex_tokens";
import { RepublicTokenContract } from "./bindings/republic_token";
import { SettlementRegistryContract } from "./bindings/settlement_registry";

const {
    DarknodeRegistry,
    Orderbook,
    RenExSettlement,
    RenExBalances,
    RenExTokens,
    PreciseToken,
    RepublicToken,
    DGXToken,
    RenExBrokerVerifier,
    SettlementRegistry,
    ApprovingBroker,
} = testUtils.contracts;

contract("RenEx", function (accounts: string[]) {

    const buyer = accounts[0];
    const seller = accounts[1];
    let details: any[];
    const VPT = 0x3;
    const ALTBTC = 0x4;

    const DGX_REN = market(TOKEN_CODES.DGX, TOKEN_CODES.REN);
    const ETH_REN = market(TOKEN_CODES.ETH, TOKEN_CODES.REN);

    before(async function () {
        const dnr: DarknodeRegistryContract = await DarknodeRegistry.deployed();
        const orderbook: OrderbookContract = await Orderbook.deployed();
        const renExSettlement: RenExSettlementContract = await RenExSettlement.deployed();
        const renExBalances: RenExBalancesContract = await RenExBalances.deployed();
        const renExTokens: RenExTokensContract = await RenExTokens.deployed();

        // PreciseToken
        const preciseToken: PreciseTokenContract = await PreciseToken.new();

        const ren: RepublicTokenContract = await RepublicToken.deployed();
        const tokenAddresses = new Map<number, testUtils.BasicERC20>()
            .set(TOKEN_CODES.BTC, testUtils.MockBTC)
            .set(TOKEN_CODES.ETH, testUtils.MockETH)
            .set(ALTBTC, testUtils.MockBTC)
            .set(TOKEN_CODES.DGX, await DGXToken.deployed())
            .set(TOKEN_CODES.REN, ren)
            .set(VPT, preciseToken);

        // Register ALTBTC
        await renExTokens.registerToken(
            ALTBTC,
            tokenAddresses.get(ALTBTC).address,
            new BN(await tokenAddresses.get(ALTBTC).decimals())
        );

        // Register VPT
        await renExTokens.registerToken(
            VPT, tokenAddresses.get(VPT).address,
            new BN(await tokenAddresses.get(VPT).decimals())
        );

        // Register darknode
        const darknode = accounts[2];
        await ren.transfer(darknode, testUtils.minimumBond);
        await ren.approve(dnr.address, testUtils.minimumBond, { from: darknode });
        await dnr.register(darknode, testUtils.PUBK("1"), { from: darknode });
        await testUtils.waitForEpoch(dnr);

        const broker = accounts[3];

        // Register broker
        const renExBrokerVerifier: RenExBrokerVerifierContract =
            await RenExBrokerVerifier.deployed();
        await renExBrokerVerifier.registerBroker(broker);

        details = [
            buyer, seller, darknode, broker, renExSettlement, renExBalances,
            tokenAddresses, orderbook, renExBrokerVerifier,
        ];
    });

    it("order 1", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 2 /* REN */, minimumVolume: 1 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.95, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* DGX */, 1 /* REN */]);
    });

    it("order 2", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 1.025641025641 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.95, volume: 1.025641025641 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.999999999 /* DGX */, 1.025641025641 /* REN */]);
    });

    it("order 3", async () => {
        const buy = { tokens: DGX_REN, price: 0.5, volume: 4 /* REN */ };
        const sell = { tokens: DGX_REN, price: 0.5, volume: 2 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 2 /* REN */]);
    });

    it("order 4", async () => {
        const buy = { tokens: DGX_REN, price: 1, volume: 1.9999999999 /* REN */ };
        // More precise than the number of decimals DGX has
        const sell = { tokens: DGX_REN, price: 0.0000000001, volume: 1.9999999999 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1 /* DGX */, 1.9999999999 /* REN */]);
    });

    it("order 5", async () => {
        const buy = { tokens: DGX_REN, price: 999.5, volume: 0.002001501126 /* REN */ };
        const sell = { tokens: DGX_REN, price: 999, volume: 0.002001501126 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([2 /* DGX */, 0.002001501126 /* REN */]);
    });

    it("order 6", async () => {
        const buy = { tokens: ETH_REN, price: 99950000, volume: "2.001e-9" /* REN */ };
        const sell = { tokens: ETH_REN, price: 99950000, volume: "2.001e-9" /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.19999995 /* ETH */, 2.001e-9 /* REN */]);
    });

    it("order 7", async () => {
        // Prices are at lowest precision possible, and mid-price is even more
        // precise. If the mid-price is rounded, this test will fail.
        const buy = { tokens: ETH_REN, price: 0.000000000002, volume: 1 /* REN */ };
        const sell = { tokens: ETH_REN, price: 0.000000000001, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([1.5e-12 /* ETH */, 1 /* REN */]);
    });

    it("atomic swap", async () => {
        const tokens = market(TOKEN_CODES.BTC, TOKEN_CODES.ETH);
        const buy = { settlement: 2, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
        const sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* REN */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* DGX */, 1 /* REN */]);
    });

    it("atomic fees are paid in ethereum-based token", async () => {
        let tokens = market(TOKEN_CODES.ETH, ALTBTC);
        let buy = { settlement: 2, tokens, price: 1, volume: 2 /* ETH */, minimumVolume: 1 /* ALTBTC */ };
        let sell = { settlement: 2, tokens, price: 0.95, volume: 1 /* ALTBTC */ };

        (await settleOrders.apply(this, [buy, sell, ...details]))
            .should.deep.equal([0.975 /* ETH */, 1 /* ALTBTC */]);
    });

    context("(negative tests)", async () => {
        const tokens = DGX_REN;

        it("seller volume too low", async () => {
            // Seller volume too low
            let buy: any = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 2 /* REN */ };
            let sell: any = { tokens, price: 1, volume: 1 /* REN */ };
            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /incompatible orders/);
        });

        it("Buyer volume too low", async () => {
            const buy = { tokens, price: 1, volume: 1 /* DGX */ };
            const sell = { tokens, price: 1, volume: 2 /* REN */, minimumVolume: 2 /* REN */ };
            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /incompatible orders/);
        });

        it("Prices don't match", async () => {
            const buy = { tokens, price: 1, volume: 1 /* DGX */ };
            const sell = { tokens, price: 1.05, volume: 1 /* REN */, minimumVolume: 1 /* DGX */ };
            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /incompatible orders/);
        });

        it("Invalid tokens (should be DGX/REN, not REN/DGX)", async () => {
            const REN_DGX = market(TOKEN_CODES.REN, TOKEN_CODES.DGX);
            const buy = { tokens: REN_DGX, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
            const sell = { tokens: REN_DGX, price: 0.95, volume: 1 /* REN */ };
            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /incompatible orders/);
        });

        it("Orders opened by the same trader", async () => {
            const buy = { tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
            const sell = { tokens, price: 0.95, volume: 1 /* REN */, trader: buyer };
            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /orders from same trader/);
        });

        it("Unsupported settlement", async () => {
            // Register unrelated settlement layer
            const settlementRegistry: SettlementRegistryContract =
                await SettlementRegistry.deployed();
            const approvingBroker: BrokerVerifierContract = await ApprovingBroker.new();
            await settlementRegistry.registerSettlement(3, approvingBroker.address, approvingBroker.address);

            const buy = { settlement: 3, tokens, price: 1, volume: 2 /* DGX */, minimumVolume: 1 /* REN */ };
            const sell = { settlement: 3, tokens, price: 0.95, volume: 1 /* REN */ };

            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /invalid settlement id/);
        });

        it("Token with too many decimals", async () => {
            const ETH_VPT = market(TOKEN_CODES.ETH, VPT);

            const buy = { tokens: ETH_VPT, price: 1e-12, volume: 1e-12 /* VPT */ };
            const sell = { tokens: ETH_VPT, price: 1e-12, volume: 1e-12 /* VPT */ };

            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /invalid opcode/);
        });

        it("Atomic swap not involving Ether", async () => {
            const BTC_ALT = market(TOKEN_CODES.BTC, ALTBTC);
            const buy = { settlement: 2, tokens: BTC_ALT, price: 1, volume: 2 /* BTC */, minimumVolume: 1 /* ALT */ };
            const sell = { settlement: 2, tokens: BTC_ALT, price: 0.95, volume: 1 /* ALTBTC */ };

            await settleOrders.apply(this, [buy, sell, ...details])
                .should.be.rejectedWith(null, /non-eth atomic swaps are not supported/);
        });
    });
});
