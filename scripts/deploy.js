// Deploys CarbonCredit, sets up demo roles, seeds sample Kenyan projects,
// and writes the contract address + ABI into the frontend.
//
// Run:  npx hardhat node                      (terminal 1)
//       npm run deploy:local                  (terminal 2)

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const MIN_COMMUNITY_SHARE_BPS = 2500; // platform minimum: 25% of every sale goes to the community

async function main() {
  const [admin, developer, verifier, buyer, communityA, communityB, communityC] =
    await ethers.getSigners();

  console.log(`Deploying to network: ${network.name}`);
  const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
  const cc = await CarbonCredit.deploy(MIN_COMMUNITY_SHARE_BPS);
  await cc.waitForDeployment();
  const address = await cc.getAddress();
  console.log(`CarbonCredit deployed at ${address}`);

  // --- Roles ---------------------------------------------------------------
  await (await cc.grantRole(await cc.DEVELOPER_ROLE(), developer.address)).wait();
  await (await cc.grantRole(await cc.VERIFIER_ROLE(), verifier.address)).wait();

  // --- Seed sample projects (local network only) -----------------------------
  if (network.name === "localhost" || network.name === "hardhat") {
    const dev = cc.connect(developer);
    const ver = cc.connect(verifier);
    const price = ethers.parseEther("0.01"); // per tonne

    await (await dev.registerProject("Kisumu Clean Cookstoves (sample)", "Kisumu County, Kenya",
      "Clean Cookstoves", "metadata/project-1.json", communityA.address, 4000)).wait();
    await (await dev.registerProject("Taita Hills Reforestation (sample)", "Taita-Taveta County, Kenya",
      "Reforestation", "metadata/project-2.json", communityB.address, 4000)).wait();
    await (await dev.registerProject("Laikipia Rangeland Restoration (sample)", "Laikipia County, Kenya",
      "Rangeland Soil Carbon", "metadata/project-3.json", communityC.address, 5000)).wait();

    // Projects 1 and 2 are verified and listed; project 3 is left pending for the demo.
    await (await ver.verifyAndIssue(1, 5000)).wait();
    await (await ver.verifyAndIssue(2, 2000)).wait();
    await (await dev.listForSale(1, 3000, price)).wait();
    await (await dev.listForSale(2, 1500, price * 2n)).wait();

    console.log("Seeded 3 sample projects (2 verified & listed, 1 awaiting verification).");
  }

  // --- Export address + ABI for the frontend ---------------------------------
  const artifact = await hre.artifacts.readArtifact("CarbonCredit");
  const out = {
    address,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    abi: artifact.abi,
  };
  const outPath = path.join(__dirname, "..", "frontend", "src", "contract.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);

  console.log("\nDemo accounts (Hardhat default keys - import into MetaMask, LOCAL USE ONLY):");
  console.log(`  #0 Admin     ${admin.address}`);
  console.log(`  #1 Developer ${developer.address}`);
  console.log(`  #2 Verifier  ${verifier.address}`);
  console.log(`  #3 Buyer     ${buyer.address}`);
  console.log(`  #4-6 Community wallets for projects 1-3`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
