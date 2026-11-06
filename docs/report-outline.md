# Project Report Outline

Target: about 15–25 pages. Use APA (or IEEE, but be consistent).

**Title page:** KaboniChain: Blockchain-Based Carbon Credit Tokenization for Kenya (SDG 13: Climate Action). KCA University, team names, date.

**Abstract** (~200 words): problem, solution, key results (tests passing, features), contribution to SDG 13.

## Chapter 1: Introduction *(Role 1)*
1.1 Background: climate change, carbon markets, Kenya's role
1.2 Problem statement (`docs/problem-statement.md`)
1.3 Objectives
1.4 Scope and limitations
1.5 Alignment with SDG 13 (Target 13.2) and with Kenya's Climate Change (Amendment) Act, 2023

## Chapter 2: Literature Review *(Role 1 with everyone's summaries)*
2.1 How voluntary carbon markets work
2.2 Problems: double-counting, low-quality credits, fees, community benefit
2.3 Blockchain fundamentals: ledgers, smart contracts, tokens (ERC-1155)
2.4 Blockchain in carbon markets: Tlili et al. (2025), Golshani et al. (2025)
2.5 Insights from the video references [129], [130]
2.6 Research gap: what existing work misses that this project addresses (community benefit-sharing in a Kenyan context)

## Chapter 3: System Design *(Role 2)*
3.1 Why blockchain and not a database (`docs/architecture.md` §4)
3.2 Pain point → feature mapping table
3.3 Architecture diagram and credit lifecycle diagram
3.4 Smart contract design: roles, data structures, functions, events
3.5 On-chain vs off-chain (IPFS) data
3.6 Tools used and why: Solidity, Hardhat, OpenZeppelin, ethers.js, React, IPFS

## Chapter 4: Implementation *(Role 3 + Role 4)*
4.1 Development environment and setup
4.2 Smart contract implementation (key code snippets)
4.3 Frontend implementation (screenshots of each page)
4.4 Deployment

## Chapter 5: Testing & Results *(Role 2)*
5.1 Test strategy
5.2 Test cases table (paste `npm test` output)
5.3 Demo walkthrough results
5.4 Security considerations: access control, reentrancy guard, self-verification block

## Chapter 6: Discussion *(everyone)*
6.1 How the solution addresses each pain point
6.2 Limitations (`docs/architecture.md` §7)
6.3 Future work: per-vintage issuance, satellite/AI verification, multisig admin, integration with Kenya's national carbon registry

## Chapter 7: Conclusion

**References** (APA), including the 2 required journals and 2 required videos

**Appendices:** GitHub link, setup guide, full test output
