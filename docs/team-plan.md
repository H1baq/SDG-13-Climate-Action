# 1-Week Team Plan (4 members)

The code is already working, so this week is about **understanding it, extending it a little, documenting it and presenting it**. Every member must be able to explain the whole flow in the Q&A.

## Roles

| Role | Owns | Rubric criteria |
|---|---|---|
| **1. Project Lead & Research** | Problem statement, references (APA), SDG 13 alignment, report editing | 1 (10%), 4 (10%) |
| **2. Smart Contract Lead** | `contracts/CarbonCredit.sol`, `test/`, explaining "why blockchain" | 2 (15%), 3 (15%) |
| **3. Integration & Deployment** | `scripts/deploy.js`, IPFS document upload, optional testnet deploy, README | 3 (15%) |
| **4. Frontend & Demo Lead** | `frontend/`, demo video, presentation slides | 5 (10%) |

Replace the role names with your names:

| Role | Name |
|---|---|
| 1. Project Lead & Research | |
| 2. Smart Contract Lead | |
| 3. Integration & Deployment | |
| 4. Frontend & Demo Lead | |

## Day-by-day

| Day | Everyone | Role 1 | Role 2 | Role 3 | Role 4 |
|---|---|---|---|---|---|
| **1** | Clone repo, run `npm test` and the app locally (see README) | Find all sources in `docs/problem-statement.md` | Read through the contract and tests and explain them to the team | Help everyone get set up | Do a full click-through of the demo |
| **2** | Each person reads 1 required reference and writes a ½-page summary | Write report Ch. 1 (Introduction, problem) | Write report section on smart contract design | Upload sample docs to IPFS (Pinata, free) and update `metadata/` links | Draft slide outline |
| **3** | Team review of architecture diagram (`docs/architecture.md`) | Report Ch. 2 (Literature review) using the 4 summaries | Add 1–2 extra tests of your own | *(Optional)* deploy to Polygon Amoy testnet | Polish UI, add team names to footer |
| **4** | Mid-week check-in: what's left? | Report Ch. 3 (Methodology & architecture) | Report: testing chapter with test output | Report: implementation & setup chapter | Record demo video (see `docs/demo-script.md`) |
| **5** | Full rehearsal of the presentation | Merge all report sections, check citations | Prepare answers to likely technical questions | Final README check | Finalise slides |
| **6** | Q&A practice: each person answers questions about **another** person's part | Final proofread | | | |
| **7** | **Submit** | | | | |

## Git workflow

1. `git pull` before you start working.
2. Make changes on a branch: `git checkout -b yourname/what-you-changed`
3. Commit with a clear message, push, and open a Pull Request.
4. Someone from another role reviews and merges it.
5. Everyone commits under their own name, because lecturers check commit history.

## Likely Q&A questions (everyone should be able to answer)

1. Why use a blockchain instead of a database?
2. How exactly does your system prevent double-counting?
3. What happens if the verifier is dishonest?
4. Why ERC-1155 instead of ERC-20 or ERC-721?
5. How does the community get paid, and can the developer stop the payment?
6. What is stored on-chain vs on IPFS, and why?
7. How does this link to SDG 13 and to Kenya specifically?
8. What would you need to change to use this in the real world?
