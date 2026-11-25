// Deploys CarbonCredit, sets up roles, seeds sample Kenyan projects, and writes the
// contract address + ABI + network details into frontend/src/deployments/<network>.json.
//
// Local:   npx hardhat node                                  (terminal 1)
//          npm run deploy:local                              (terminal 2)
// Testnet: fill in .env (see .env.example), then
//          npm run deploy:amoy

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const MIN_COMMUNITY_SHARE_BPS = 2500; // platform minimum: 25% of every sale goes to the community
const LOCAL = network.name === "localhost" || network.name === "hardhat";

// Network details the frontend needs to read data and to add the network to MetaMask.
const NETWORKS = {
  localhost: {
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    currency: "ETH",
    explorer: null,
  },
  amoy: {
    chainName: "Polygon Amoy Testnet",
    rpcUrl: "https://polygon-amoy-bor-rpc.publicnode.com",
    currency: "POL",
    explorer: "https://amoy.polygonscan.com",
  },
};

const SAMPLE_PROJECTS = [
  ["Kisumu Clean Cookstoves (sample)", "Kisumu County, Kenya", "Clean Cookstoves", "metadata/project-1.json", 4000],
  ["Taita Hills Reforestation (sample)", "Taita-Taveta County, Kenya", "Reforestation", "metadata/project-2.json", 4000],
  ["Laikipia Rangeland Restoration (sample)", "Laikipia County, Kenya", "Rangeland Soil Carbon", "metadata/project-3.json", 5000],
];

// Public networks: wait for a few blocks, and never hang forever on a transaction nobody includes.
const CONFIRMATIONS = LOCAL ? 1 : 3;
const TX_TIMEOUT_MS = 180_000;
const MIN_TIP = ethers.parseUnits("30", "gwei"); // Polygon validators ignore smaller tips
const nonces = new Map(); // address -> next nonce
const stuckUntil = new Map(); // address -> nonces below this replace a stuck transaction

// Hardhat's automatic maxFeePerGas leaves no room for Polygon's large tip, so transactions get
// stuck. Set the fees explicitly, and reuse the nonce of any stuck transaction to replace it.
async function txOverrides(signer) {
  if (LOCAL) return {};
  const { address } = signer;
  if (!nonces.has(address)) {
    const latest = await ethers.provider.getTransactionCount(address, "latest");
    const pending = await ethers.provider.getTransactionCount(address, "pending");
    nonces.set(address, latest);
    stuckUntil.set(address, pending);
    if (pending > latest) console.log(`  (Replacing ${pending - latest} stuck transaction(s) from ${address})`);
  }
  const nonce = nonces.get(address);
  const block = await ethers.provider.getBlock("latest");
  const suggested = BigInt(await ethers.provider.send("eth_maxPriorityFeePerGas", []).catch(() => 0));
  let tip = suggested > MIN_TIP ? suggested : MIN_TIP;
  if (nonce < stuckUntil.get(address)) tip = (tip * 125n) / 100n; // a replacement must pay at least 10% more
  return { nonce, maxPriorityFeePerGas: tip, maxFeePerGas: block.baseFeePerGas * 2n + tip };
}

// Public RPCs are load-balanced, so a server may briefly lag behind the last block. Only used for
// reads and gas estimates, which are safe to repeat.
async function retryRead(fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (LOCAL || attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function send(label, signer, contract, fn, ...args) {
  const method = contract.connect(signer)[fn];
  const overrides = await retryRead(() => txOverrides(signer));
  if (!LOCAL) overrides.gasLimit = ((await retryRead(() => method.estimateGas(...args))) * 12n) / 10n;
  const tx = await method(...args, overrides);
  if (!LOCAL) nonces.set(signer.address, overrides.nonce + 1);
  await tx.wait(CONFIRMATIONS, TX_TIMEOUT_MS);
  console.log(`  ✔ ${label}`);
}

function communityWallets(localSigners) {
  if (LOCAL) return localSigners.map((s) => s.address);
  const fromEnv = (process.env.COMMUNITY_WALLETS || "").split(",").map((a) => a.trim()).filter(Boolean);
  if (fromEnv.length) {
    if (fromEnv.length !== 3 || !fromEnv.every(ethers.isAddress)) {
      throw new Error("COMMUNITY_WALLETS must be exactly 3 comma-separated addresses");
    }
    return fromEnv;
  }
  const generated = [0, 1, 2].map(() => ethers.Wallet.createRandom().address);
  console.log("  (No COMMUNITY_WALLETS set: generated demo community addresses)");
  return generated;
}

async function main() {
  const signers = await ethers.getSigners();
  if (!signers.length) throw new Error("No deployer account. Set DEPLOYER_PRIVATE_KEY in .env");

  // Locally: Hardhat's 20 test accounts. On a public network: deployer (+ optional verifier) from .env.
  const admin = signers[0];
  const developer = LOCAL ? signers[1] : signers[0];
  const verifier = LOCAL ? signers[2] : signers[1];
  const communities = communityWallets(LOCAL ? signers.slice(4, 7) : []);

  console.log(`Deploying to network: ${network.name}`);
  // Check balances before spending anything, so a deployment never stops halfway.
  for (const [who, signer] of [["Deployer", admin], ["Verifier", verifier]]) {
    if (!signer) continue;
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`${who}: ${signer.address} (balance ${ethers.formatEther(balance)})`);
    if (balance === 0n) {
      throw new Error(`${who} ${signer.address} has no funds. Get test tokens from a faucet (e.g. https://faucet.polygon.technology) and try again.`);
    }
  }

  const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
  const overrides = await retryRead(() => txOverrides(admin));
  const cc = await CarbonCredit.deploy(MIN_COMMUNITY_SHARE_BPS, overrides);
  if (!LOCAL) nonces.set(admin.address, overrides.nonce + 1);
  console.log(`Deploy transaction sent: ${cc.deploymentTransaction().hash}`);
  const deployBlock = (await cc.deploymentTransaction().wait(CONFIRMATIONS, TX_TIMEOUT_MS)).blockNumber;
  const address = await cc.getAddress();
  console.log(`CarbonCredit deployed at ${address}`);

  // --- Roles ---------------------------------------------------------------
  const developerRole = await retryRead(() => cc.DEVELOPER_ROLE());
  await send(`DEVELOPER_ROLE → ${developer.address}`, admin, cc, "grantRole", developerRole, developer.address);
  if (verifier) {
    const verifierRole = await retryRead(() => cc.VERIFIER_ROLE());
    await send(`VERIFIER_ROLE → ${verifier.address}`, admin, cc, "grantRole", verifierRole, verifier.address);
  }

  // --- Seed sample projects ---------------------------------------------------
  // Testnet prices are tiny so that faucet POL is enough to try buying.
  const price = LOCAL ? ethers.parseEther("0.01") : ethers.parseEther("0.0001"); // per tonne
  for (const [i, [name, location, type, uri, share]] of SAMPLE_PROJECTS.entries()) {
    await send(`registered ${name}`, developer, cc, "registerProject", name, location, type, uri, communities[i], share);
  }

  if (verifier) {
    // Projects 1 and 2 are verified and listed; project 3 is left pending for the demo.
    await send("verified project 1 (5000 t)", verifier, cc, "verifyAndIssue", 1, 5000);
    await send("verified project 2 (2000 t)", verifier, cc, "verifyAndIssue", 2, 2000);
    await send("listed 3000 t of project 1", developer, cc, "listForSale", 1, 3000, price);
    await send("listed 1500 t of project 2", developer, cc, "listForSale", 2, 1500, price * 2n);
    console.log("Seeded 3 sample projects (2 verified & listed, 1 awaiting verification).");
  } else {
    console.log("No VERIFIER_PRIVATE_KEY set: projects registered but not verified or listed.");
  }

  // --- Export deployment for the frontend -------------------------------------
  const key = LOCAL ? "localhost" : network.name;
  const details = NETWORKS[key] || { chainName: network.name, rpcUrl: network.config.url, currency: "ETH", explorer: null };
  const artifact = await hre.artifacts.readArtifact("CarbonCredit");
  const out = {
    network: key,
    ...details,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    deployBlock,
    abi: artifact.abi,
  };
  const outPath = path.join(__dirname, "..", "frontend", "src", "deployments", `${key}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);

  if (LOCAL) {
    console.log("\nDemo accounts (Hardhat default keys - import into MetaMask, LOCAL USE ONLY):");
    console.log(`  #0 Admin     ${admin.address}`);
    console.log(`  #1 Developer ${developer.address}`);
    console.log(`  #2 Verifier  ${verifier.address}`);
    console.log(`  #3 Buyer     ${signers[3].address}`);
    console.log(`  #4-6 Community wallets for projects 1-3`);
  } else {
    console.log(`\nView the contract: ${details.explorer ? `${details.explorer}/address/${address}` : address}`);
    console.log(`Admin + Developer: ${developer.address}`);
    if (verifier) console.log(`Verifier:          ${verifier.address}`);
    console.log(`Community wallets: ${communities.join(", ")}`);
    console.log(`\nNext: commit ${path.relative(process.cwd(), outPath)} and push, so the hosted site uses this deployment.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
