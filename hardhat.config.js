require("@nomicfoundation/hardhat-toolbox");
const { subtask } = require("hardhat/config");

// Load deployment secrets from .env (git-ignored). Uses Node's built-in loader, so no extra package.
try {
  process.loadEnvFile?.();
} catch {
  // no .env file: fine for local development and tests
}
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

const SOLC_VERSION = "0.8.24";

// Use the Solidity compiler installed from npm (the `solc` package) instead of
// downloading it from binaries.soliditylang.org. This makes compiling work on
// networks where that site is blocked (e.g. some campus or cloud networks).
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    const solcJsPath = require.resolve("solc/soljson.js");
    return {
      compilerPath: solcJsPath,
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: require("solc").version(),
    };
  }
  return runSuper();
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: SOLC_VERSION,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    // Polygon Amoy public testnet. Put your keys in .env (see .env.example); never commit it.
    // Account order matters: [0] = deployer/admin/developer, [1] = verifier (optional but needed for seeding).
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.VERIFIER_PRIVATE_KEY].filter(Boolean),
    },
  },
};
