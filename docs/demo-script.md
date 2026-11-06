# Demo Script (about 5 minutes)

**Before the demo:** restart the chain so the data is clean.

```bash
npx hardhat node          # terminal 1 (leave running)
npm run deploy:local      # terminal 2
cd frontend && npm run dev
```

In MetaMask, **reset the account** for each demo account after restarting the chain (Settings → Advanced → Clear activity tab data). Otherwise the transaction counters get out of sync.

| # | Who | Action | What to say |
|---|---|---|---|
| 1 | — | Show the dashboard stats | "Every number here is read live from the blockchain, and anyone can check it." |
| 2 | **Verifier** (account #2) | Verifier tab → Laikipia project → issue 800 t | "Only an independent verifier can create credits, and a developer can't verify their own project." |
| 3 | **Buyer** (account #3) | Marketplace → buy 100 t of Kisumu Cookstoves | "Look under the buy button: 40% of the payment goes straight to the community wallet in the same transaction. No broker is involved." |
| 4 | — | Point at the "Paid to communities" stat | "The community share is now visible publicly." |
| 5 | **Buyer** | My Credits → retire 60 t for "KCA University 2026" | "Retiring burns the tokens permanently." |
| 6 | **Buyer** | Try to retire 1000 t | "This fails, because you can't retire credits that no longer exist. That is how we stop double-counting." |
| 7 | — | Retirement Registry → Certificate | "Anyone can verify this offset claim. The certificate links to the on-chain record." |
| 8 | — | Terminal: `npm test` | "18 automated tests cover every rule, including double-counting." |

Close with: *"KaboniChain makes Kenyan carbon credits traceable from project to retirement, makes double-counting impossible by design, and pays communities their share automatically, supporting SDG 13."*
