const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("CarbonCredit (SDG 13)", function () {
  const MIN_SHARE_BPS = 2500; // platform minimum: 25% to the community
  const PRICE = ethers.parseEther("0.01"); // per tonne

  async function deployFixture() {
    const [admin, developer, verifier, buyer, community, stranger] = await ethers.getSigners();

    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const cc = await CarbonCredit.deploy(MIN_SHARE_BPS);

    await cc.grantRole(await cc.DEVELOPER_ROLE(), developer.address);
    await cc.grantRole(await cc.VERIFIER_ROLE(), verifier.address);

    return { cc, admin, developer, verifier, buyer, community, stranger };
  }

  async function registeredFixture() {
    const f = await deployFixture();
    await f.cc
      .connect(f.developer)
      .registerProject(
        "Sample Cookstove Project",
        "Kisumu, Kenya",
        "Clean Cookstoves",
        "ipfs://sample-cid",
        f.community.address,
        4000 // 40% to the community
      );
    return f;
  }

  async function listedFixture() {
    const f = await registeredFixture();
    await f.cc.connect(f.verifier).verifyAndIssue(1, 1000);
    await f.cc.connect(f.developer).listForSale(1, 500, PRICE);
    return f;
  }

  describe("1. Register project", function () {
    it("lets a developer register a project", async function () {
      const { cc, developer, community } = await loadFixture(registeredFixture);
      const p = await cc.getProject(1);
      expect(p.name).to.equal("Sample Cookstove Project");
      expect(p.developer).to.equal(developer.address);
      expect(p.communityWallet).to.equal(community.address);
      expect(p.verified).to.equal(false);
      expect(await cc.projectCount()).to.equal(1);
    });

    it("blocks accounts without the DEVELOPER role", async function () {
      const { cc, stranger, community } = await loadFixture(deployFixture);
      await expect(
        cc.connect(stranger).registerProject("X", "Y", "Z", "", community.address, 4000)
      ).to.be.revertedWithCustomError(cc, "AccessControlUnauthorizedAccount");
    });

    it("rejects a community share below the platform minimum", async function () {
      const { cc, developer, community } = await loadFixture(deployFixture);
      await expect(
        cc.connect(developer).registerProject("X", "Y", "Z", "", community.address, 1000)
      ).to.be.revertedWithCustomError(cc, "ShareOutOfRange");
    });
  });

  describe("2. Verify & issue", function () {
    it("mints credits to the developer when a verifier approves", async function () {
      const { cc, verifier, developer } = await loadFixture(registeredFixture);
      await expect(cc.connect(verifier).verifyAndIssue(1, 1000))
        .to.emit(cc, "CreditsIssued")
        .withArgs(1, verifier.address, 1000);
      expect(await cc.balanceOf(developer.address, 1)).to.equal(1000);
      expect((await cc.getProject(1)).verified).to.equal(true);
    });

    it("blocks non-verifiers from issuing credits", async function () {
      const { cc, developer } = await loadFixture(registeredFixture);
      await expect(cc.connect(developer).verifyAndIssue(1, 1000)).to.be.revertedWithCustomError(
        cc,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("prevents a developer from verifying their own project", async function () {
      const { cc, admin, developer } = await loadFixture(registeredFixture);
      await cc.connect(admin).grantRole(await cc.VERIFIER_ROLE(), developer.address);
      await expect(cc.connect(developer).verifyAndIssue(1, 1000)).to.be.revertedWithCustomError(
        cc,
        "SelfVerification"
      );
    });

    it("prevents issuing the same project twice (no over-issuance)", async function () {
      const { cc, verifier } = await loadFixture(registeredFixture);
      await cc.connect(verifier).verifyAndIssue(1, 1000);
      await expect(cc.connect(verifier).verifyAndIssue(1, 1000)).to.be.revertedWithCustomError(
        cc,
        "AlreadyVerified"
      );
    });
  });

  describe("3. List for sale", function () {
    it("moves credits into escrow", async function () {
      const { cc, developer } = await loadFixture(listedFixture);
      expect(await cc.balanceOf(developer.address, 1)).to.equal(500);
      expect(await cc.balanceOf(await cc.getAddress(), 1)).to.equal(500);
      expect((await cc.getProject(1)).listedAmount).to.equal(500);
    });

    it("cannot list an unverified project", async function () {
      const { cc, developer } = await loadFixture(registeredFixture);
      await expect(cc.connect(developer).listForSale(1, 10, PRICE)).to.be.revertedWithCustomError(
        cc,
        "NotVerified"
      );
    });

    it("only the project developer can list", async function () {
      const { cc, stranger } = await loadFixture(listedFixture);
      await expect(cc.connect(stranger).listForSale(1, 10, PRICE)).to.be.revertedWithCustomError(
        cc,
        "NotProjectDeveloper"
      );
    });
  });

  describe("4. Buy with community benefit-sharing", function () {
    it("transfers credits and splits payment 60/40 between developer and community", async function () {
      const { cc, buyer, developer, community } = await loadFixture(listedFixture);
      const cost = PRICE * 100n;

      await expect(cc.connect(buyer).buyCredits(1, 100, { value: cost })).to.changeEtherBalances(
        [buyer, developer, community],
        [-cost, (cost * 60n) / 100n, (cost * 40n) / 100n]
      );
      expect(await cc.balanceOf(buyer.address, 1)).to.equal(100);
      expect((await cc.getProject(1)).listedAmount).to.equal(400);
    });

    it("rejects the wrong payment amount", async function () {
      const { cc, buyer } = await loadFixture(listedFixture);
      await expect(
        cc.connect(buyer).buyCredits(1, 100, { value: PRICE })
      ).to.be.revertedWithCustomError(cc, "WrongPayment");
    });

    it("cannot buy more than is listed", async function () {
      const { cc, buyer } = await loadFixture(listedFixture);
      await expect(
        cc.connect(buyer).buyCredits(1, 501, { value: PRICE * 501n })
      ).to.be.revertedWithCustomError(cc, "NotEnoughListed");
    });
  });

  describe("5. Retire - prevents double-counting", function () {
    it("burns retired credits and records the retirement publicly", async function () {
      const { cc, buyer } = await loadFixture(listedFixture);
      await cc.connect(buyer).buyCredits(1, 100, { value: PRICE * 100n });

      await expect(cc.connect(buyer).retireCredits(1, 60, "Acme Ltd - 2026 emissions"))
        .to.emit(cc, "CreditsRetired")
        .withArgs(0, 1, buyer.address, 60, "Acme Ltd - 2026 emissions");

      expect(await cc.balanceOf(buyer.address, 1)).to.equal(40);
      expect((await cc.getProject(1)).totalRetired).to.equal(60);

      const r = await cc.getRetirement(0);
      expect(r.retiredBy).to.equal(buyer.address);
      expect(r.amount).to.equal(60);
    });

    it("a retired credit can NOT be retired again (double-counting blocked)", async function () {
      const { cc, buyer } = await loadFixture(listedFixture);
      await cc.connect(buyer).buyCredits(1, 10, { value: PRICE * 10n });
      await cc.connect(buyer).retireCredits(1, 10, "First claim");

      await expect(cc.connect(buyer).retireCredits(1, 10, "Second claim")).to.be.revertedWithCustomError(
        cc,
        "ERC1155InsufficientBalance"
      );
    });

    it("a retired credit can NOT be resold or transferred", async function () {
      const { cc, buyer, stranger } = await loadFixture(listedFixture);
      await cc.connect(buyer).buyCredits(1, 10, { value: PRICE * 10n });
      await cc.connect(buyer).retireCredits(1, 10, "Claimed");

      await expect(
        cc.connect(buyer).safeTransferFrom(buyer.address, stranger.address, 1, 1, "0x")
      ).to.be.revertedWithCustomError(cc, "ERC1155InsufficientBalance");
    });

    it("you cannot retire credits you don't own", async function () {
      const { cc, stranger } = await loadFixture(listedFixture);
      await expect(cc.connect(stranger).retireCredits(1, 1, "Fake claim")).to.be.revertedWithCustomError(
        cc,
        "ERC1155InsufficientBalance"
      );
    });
  });

  describe("Full lifecycle", function () {
    it("issued = held + listed + retired at every step", async function () {
      const { cc, developer, buyer } = await loadFixture(listedFixture);
      await cc.connect(buyer).buyCredits(1, 200, { value: PRICE * 200n });
      await cc.connect(buyer).retireCredits(1, 150, "Offset");

      const p = await cc.getProject(1);
      const devBal = await cc.balanceOf(developer.address, 1);
      const buyerBal = await cc.balanceOf(buyer.address, 1);
      expect(devBal + buyerBal + p.listedAmount + p.totalRetired).to.equal(p.totalIssued);
    });
  });
});
