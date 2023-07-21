module.exports = async function (deployer, network) {
    // Network is "development", "nightly", "testnet" or "mainnet"

    const {
        // Republic
        DarknodeRewardVault,
        Orderbook,

        // RenEx
        RenExBalances,
        RenExTokens,
        RenExSettlement,
        RenExBrokerVerifier,
        SettlementRegistry,
    } = require("./artifacts")(network, artifacts);

    const config = require("./config.js")(network);

    const VERSION_STRING = `${network}-${config.VERSION}`;

    await deployer

        .then(() => deployer.deploy(
            RenExTokens,
            VERSION_STRING,
        ))

        .then(() => deployer.deploy(
            RenExBrokerVerifier,
            VERSION_STRING,
        ))

        .then(() => deployer.deploy(
            RenExBalances,
            VERSION_STRING,
            DarknodeRewardVault.address,
            RenExBrokerVerifier.address,
        ))

        .then(async () => {
            const renExBrokerVerifier = await RenExBrokerVerifier.at(RenExBrokerVerifier.address);
            await renExBrokerVerifier.updateBalancesContract(RenExBalances.address);
            if (config.settings.renex.ingressAddress) {
                await renExBrokerVerifier.registerBroker(config.settings.renex.ingressAddress);
            }
        })

        .then(() => deployer.deploy(
            RenExSettlement,
            VERSION_STRING,
            Orderbook.address,
            RenExTokens.address,
            RenExBalances.address,
            config.settings.renex.watchdogAddress,
            config.settings.renex.submitOrderGasLimit,
        ))

        .then(async () => {
            const renExBalances = await RenExBalances.at(RenExBalances.address);
            await renExBalances.updateRewardVaultContract(DarknodeRewardVault.address);
            await renExBalances.updateRenExSettlementContract(RenExSettlement.address);
        })

        .then(async () => {
            const settlementRegistry = await SettlementRegistry.at(SettlementRegistry.address);
            // Register RenEx
            await settlementRegistry.registerSettlement(1, RenExSettlement.address, RenExBrokerVerifier.address);
            // Register RenExAtomic
            await settlementRegistry.registerSettlement(2, RenExSettlement.address, RenExBrokerVerifier.address);
        });
}