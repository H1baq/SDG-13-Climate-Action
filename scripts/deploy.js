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
    rpcUrl: "https://rpc-amoy.polygon.technology",
    currency: "POL",
    explorer: "https://amoy.polygonscan.com",
  },
};

const SAMPLE_PROJECTS = [
  ["Kisumu Clean Cookstoves (sample)", "Kisumu County, Kenya", "Clean Cookstoves", "metadata/project-1.json", 4000],
  ["Taita Hills Reforestation (sample)", "Taita-Taveta County, Kenya", "Reforestation", "metadata/project-2.json", 4000],
  ["Laikipia Rangeland Restoration (sample)", "Laikipia County, Kenya", "Rangeland Soil Carbon", "metadata/project-3.json", 5000],
];

async function send(label, txPromise) {
  const tx = await txPromise;
  await tx.wait();
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
  const cc = await CarbonCredit.deploy(MIN_COMMUNITY_SHARE_BPS);
  await cc.waitForDeployment();
  const deployBlock = (await cc.deploymentTransaction().wait()).blockNumber;
  const address = await cc.getAddress();
  console.log(`CarbonCredit deployed at ${address}`);

  // --- Roles ---------------------------------------------------------------
  await send(`DEVELOPER_ROLE → ${developer.address}`, cc.grantRole(await cc.DEVELOPER_ROLE(), developer.address));
  if (verifier) {
    await send(`VERIFIER_ROLE → ${verifier.address}`, cc.grantRole(await cc.VERIFIER_ROLE(), verifier.address));
  }

  // --- Seed sample projects ---------------------------------------------------
  // Testnet prices are tiny so that faucet POL is enough to try buying.
  const price = LOCAL ? ethers.parseEther("0.01") : ethers.parseEther("0.0001"); // per tonne
  const dev = cc.connect(developer);
  for (const [i, [name, location, type, uri, share]] of SAMPLE_PROJECTS.entries()) {
    await send(`registered ${name}`, dev.registerProject(name, location, type, uri, communities[i], share));
  }

  if (verifier) {
    // Projects 1 and 2 are verified and listed; project 3 is left pending for the demo.
    const ver = cc.connect(verifier);
    await send("verified project 1 (5000 t)", ver.verifyAndIssue(1, 5000));
    await send("verified project 2 (2000 t)", ver.verifyAndIssue(2, 2000));
    await send("listed 3000 t of project 1", dev.listForSale(1, 3000, price));
    await send("listed 1500 t of project 2", dev.listForSale(2, 1500, price * 2n));
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
