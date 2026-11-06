# 🌍 KaboniChain: Carbon Credit Tokenization for Kenya

**SDG 13: Climate Action** · KCA University Blockchain Project (Framework #10)

*Kaboni* is Swahili for *carbon*.

KaboniChain turns verified carbon credits into blockchain tokens (**1 token = 1 tonne of CO₂e**). The platform makes every credit traceable from the climate project to its final retirement, stops **double-counting** by burning credits when they are used, and **pays local communities their share automatically** every time credits are sold.

## The problem

The voluntary carbon market suffers from double-counting, lack of transparency and high broker fees. In Kenya, communities living around carbon projects often can't see how much money the projects earn or whether they receive their share. See [`docs/problem-statement.md`](docs/problem-statement.md).

## How it works

| Step | Who | What happens on-chain |
|---|---|---|
| 1. Register | Project developer | Project details, documents (IPFS) and community wallet are recorded |
| 2. Verify & issue | Independent verifier | Credits are minted (ERC-1155). Developers can't verify their own projects |
| 3. List | Developer | Credits go into escrow at a set price per tonne |
| 4. Buy | Buyer | Payment is split automatically: e.g. **40% to the community**, 60% to the developer |
| 5. Retire | Credit owner | Credits are **burned** and recorded in a public registry with a certificate. They can never be resold or claimed again |

Architecture diagrams, pain-point mapping and the "why blockchain?" justification are in [`docs/architecture.md`](docs/architecture.md).

## Tech stack

| Layer | Tool |
|---|---|
| Smart contract | Solidity 0.8.24, OpenZeppelin (ERC-1155, AccessControl, ReentrancyGuard) |
| Development & testing | Hardhat, Mocha/Chai |
| Frontend | React.js (Vite), ethers.js v6, MetaMask |
| Document storage | IPFS (links stored in the contract) |
| Network | Hardhat local network; Polygon Amoy testnet optional |

## Quick start

**Prerequisites:** Node.js 18+, Git, and the MetaMask browser extension.

```bash
git clone https://github.com/H1baq/SDG-13-Climate-Action.git
cd SDG-13-Climate-Action
npm install
cd frontend && npm install && cd ..
```

**Run the tests:**

```bash
npm test
```

**Run the app.** Use 3 terminals.

```bash
# Terminal 1: start a local blockchain (leave it running)
npx hardhat node
```

```bash
# Terminal 2: deploy the contract and load sample projects
npm run deploy:local
```

```bash
# Terminal 3: start the website
cd frontend
npm run dev
```

Open http://localhost:5173

### MetaMask setup (one time)

1. Add a network: **Hardhat Local**, RPC URL `http://127.0.0.1:8545`, Chain ID `31337`, currency `ETH`. The app will also offer to add it when you click *Connect wallet*.
2. Import these **public Hardhat test accounts** using the private keys printed in Terminal 1:

| Account | Role in the demo |
|---|---|
| #1 `0x7099…79C8` | Project Developer |
| #2 `0x3C44…93BC` | Verifier |
| #3 `0x90F7…b906` | Buyer |

> ⚠️ These keys are public and for local testing only. Never send real money to them.
>
> If you restart `npx hardhat node`, clear each account's activity in MetaMask (Settings → Advanced → Clear activity tab data).

## Project structure

```
contracts/CarbonCredit.sol     Smart contract
test/CarbonCredit.test.js      18 automated tests
scripts/deploy.js              Deploys and seeds 3 sample Kenyan projects
metadata/                      Sample project metadata (would be uploaded to IPFS)
frontend/                      React dApp
docs/                          Problem statement, architecture, team plan, demo script, report outline
```

## Test results

```
CarbonCredit (SDG 13)
  1. Register project        ✔ 3 tests
  2. Verify & issue          ✔ 4 tests (incl. no self-verification, no over-issuance)
  3. List for sale           ✔ 3 tests
  4. Buy with benefit-share  ✔ 3 tests (incl. 60/40 payment split)
  5. Retire                  ✔ 4 tests (incl. retired credit can't be resold or re-retired)
  Full lifecycle             ✔ 1 test
  18 passing
```

## Team

| Role | Name |
|---|---|
| Project Lead & Research | |
| Smart Contract Lead | |
| Integration & Deployment | |
| Frontend & Demo Lead | |

See [`docs/team-plan.md`](docs/team-plan.md) for the 1-week plan.

## References

1. Tlili, H. et al. (2025). Blockchain and tokenized carbon markets: Empirical evidence. *ScienceDirect.*
2. Golshani, F. et al. (2025). Democratized carbon credit trading on a blockchain. *Taylor & Francis.*
3. Nadcab Labs. *Carbon Credit Tokens Explained | Blockchain, Climate & Investment* [Video]. YouTube.
4. *How Carbon Credit Trading Works: The $1.5T Market* [Video]. YouTube.

*All project data in this repository is sample data for demonstration.*

## License

MIT
