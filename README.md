🌍 KaboniChain: Carbon Credit Tokenization for Kenya
SDG 13: Climate Action · KCA University Blockchain Project (Framework #10)

Kaboni is Swahili for carbon.

KaboniChain turns verified carbon credits into blockchain tokens (1 token = 1 tonne of CO₂e). The platform makes every credit traceable from the climate project to its final retirement, stops double-counting by burning credits when they are used, and pays local communities their share automatically every time credits are sold.

The problem
The voluntary carbon market suffers from double-counting, lack of transparency and high broker fees. In Kenya, communities living around carbon projects often can't see how much money the projects earn or whether they receive their share. The Climate Change (Amendment) Act, 2023 now requires projects to share at least 40% (land-based) or 25% (other projects) of their earnings with communities, but gives communities no way to check this. See docs/problem-statement.md.

📄 Full project report: docs/report.md, covering literature review, design, implementation, testing, discussion and APA references.

How it works
Step	Who	What happens on-chain
1. Register	Project developer	Project details, documents (IPFS) and community wallet are recorded
2. Verify & issue	Independent verifier	Credits are minted (ERC-1155). Developers can't verify their own projects
3. List	Developer	Credits go into escrow at a set price per tonne
4. Buy	Buyer	Payment is split automatically: e.g. 40% to the community, 60% to the developer
5. Retire	Credit owner	Credits are burned and recorded in a public registry with a certificate. They can never be resold or claimed again
Architecture diagrams, pain-point mapping and the "why blockchain?" justification are in docs/architecture.md.

Tech stack
Layer	Tool
Smart contract	Solidity 0.8.24, OpenZeppelin (ERC-1155, AccessControl, ReentrancyGuard)
Development & testing	Hardhat, Mocha/Chai
Frontend	React.js (Vite), ethers.js v6, MetaMask
Document storage	IPFS (links stored in the contract)
Network	Hardhat local network; Polygon Amoy testnet optional
Quick start
Prerequisites: Node.js 18+, Git, and the MetaMask browser extension.

git clone https://github.com/H1baq/SDG-13-Climate-Action.git
cd SDG-13-Climate-Action
npm install
cd frontend && npm install && cd ..
Run the tests:

npm test
Run the app. Use 3 terminals.

# Terminal 1: start a local blockchain (leave it running)
npx hardhat node
# Terminal 2: deploy the contract and load sample projects
npm run deploy:local
# Terminal 3: start the website
cd frontend
npm run dev
Open http://localhost:5173

MetaMask setup (one time)
Add a network: Hardhat Local, RPC URL http://127.0.0.1:8545, Chain ID 31337, currency ETH. The app will also offer to add it when you click Connect wallet.
Import these public Hardhat test accounts using the private keys printed in Terminal 1:
Account	Role in the demo
#1 0x7099…79C8	Project Developer
#2 0x3C44…93BC	Verifier
#3 0x90F7…b906	Buyer
⚠️ These keys are public and for local testing only. Never send real money to them.

If you restart npx hardhat node, clear each account's activity in MetaMask (Settings → Advanced → Clear activity tab data).

Deploy online (Polygon Amoy testnet + Vercel)
Amoy is a free public test network, and its tokens have no real value. A deployment takes two steps: put the contract on Amoy, then host the website.

1. Deploy the contract to Amoy
In MetaMask, create two new accounts for this demo only: a deployer (who becomes admin and project developer) and a verifier. A developer can't verify their own project, so the verifier must be a different account. Never use a wallet that holds real money.
Get free test POL for both accounts from the Polygon faucet. Faucets usually allow one request per day.
Copy .env.example to .env and paste in the two private keys (MetaMask → account menu → Account details → Show private key). .env is git-ignored and never committed.
cp .env.example .env
Deploy and seed the three sample projects:
npm run deploy:amoy
The script checks both balances before spending anything. It prints the contract's link on amoy.polygonscan.com and writes frontend/src/deployments/amoy.json.
Commit and push that file, so the hosted site knows where the contract is:
git add frontend/src/deployments/amoy.json
git commit -m "Deploy contract to Polygon Amoy"
git push
2. Host the website on Vercel
Sign in at vercel.com with GitHub and import this repository.
Set Root Directory to frontend. Vercel detects Vite and uses npm run build with the output directory dist.
Click Deploy. You get a public URL, and every git push redeploys the site automatically.
Production builds use the Amoy deployment (frontend/.env.production), while npm run dev keeps using your local chain. Netlify works the same way: base directory frontend, build command npm run build, publish directory frontend/dist.

Using the live site
Visitors can browse projects, sales and retirements without a wallet.
To make transactions, click Connect wallet. The app offers to add the Amoy network to MetaMask (chain ID 80002, currency POL).
Import your deployer account to act as Developer and your verifier account to act as Verifier. Any account with a little test POL can act as Buyer. Testnet prices are set very low, at 0.0001 POL per tonne, so faucet tokens are enough.
To use your own community wallets instead of generated ones, set COMMUNITY_WALLETS in .env before deploying.
Project structure
contracts/CarbonCredit.sol     Smart contract
test/CarbonCredit.test.js      18 automated tests
scripts/deploy.js              Deploys and seeds 3 sample Kenyan projects (local or Amoy)
frontend/src/deployments/      Contract address + ABI per network (written by deploy.js)
.env.example                   Template for testnet deployment keys (copy to .env)
metadata/                      Sample project metadata (would be uploaded to IPFS)
frontend/                      React dApp
docs/report.md                 Full project report with APA references
docs/                          Problem statement, architecture, demo script, screenshots (docs/images/)
Test results
CarbonCredit (SDG 13)
  1. Register project        ✔ 3 tests
  2. Verify & issue          ✔ 4 tests (incl. no self-verification, no over-issuance)
  3. List for sale           ✔ 3 tests
  4. Buy with benefit-share  ✔ 3 tests (incl. 60/40 payment split)
  5. Retire                  ✔ 4 tests (incl. retired credit can't be resold or re-retired)
  Full lifecycle             ✔ 1 test
  18 passing
References
Key references are listed below. The full list of 28 references is in docs/report.md.

Tlili, H. (2025). Blockchain and tokenized carbon markets: Empirical evidence on market efficiency and transaction dynamics. Sustainable Futures, 10, Article 101109. https://doi.org/10.1016/j.sftr.2025.101109
Golshani, F., & Mankar, A. (2025). Democratized carbon credit trading on a blockchain platform. Technology and Innovation, 24(4), 221–231. https://doi.org/10.1080/19498241.2025.2611313
Nadcab Labs. (2025, June 21). Carbon credit tokens explained | Blockchain, climate & investment [Video]. https://www.nadcab.com/podcast/carbon-credit-tokens-on-blockchain
How carbon credit trading works: The $1.5T market [Video]. YouTube.
Climate Change Act, Cap. 387A (Kenya), as amended by the Climate Change (Amendment) Act, No. 9 of 2023, ss. 23E–23G.
Schneider, L., et al. (2019). Double counting and the Paris Agreement rulebook. Science, 366(6462), 180–183. https://doi.org/10.1126/science.aay8750
All project data in this repository is sample data for demonstration.

License
MIT
