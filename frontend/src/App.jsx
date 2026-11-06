import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import contractInfo from "./contract.json";

const LOCAL_RPC = "http://127.0.0.1:8545";
const TABS = ["Marketplace", "My Credits", "Developer", "Verifier", "Retirement Registry"];

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const pct = (bps) => `${Number(bps) / 100}%`;

const FRIENDLY = {
  ERC1155InsufficientBalance: "You don't have enough credits for that",
  NotEnoughListed: "Not enough credits are listed for sale",
  WrongPayment: "Payment amount doesn't match the price",
  AlreadyVerified: "This project has already been verified",
  SelfVerification: "A developer can't verify their own project",
  ShareOutOfRange: "Community share is below the platform minimum (25%)",
  NotVerified: "This project hasn't been verified yet",
  NotProjectDeveloper: "Only the project's developer can do this",
  AccessControlUnauthorizedAccount: "Your account doesn't have the role needed for this",
  InvalidAddress: "Enter a valid community wallet address",
  InvalidAmount: "Enter an amount greater than zero",
};

function errorMessage(err) {
  const raw = JSON.stringify(err?.info ?? "") + " " + (err?.message ?? "");
  const known = Object.keys(FRIENDLY).find((k) => err?.revert?.name === k || raw.includes(k));
  if (known) return FRIENDLY[known];
  return (
    err?.revert?.name ||
    err?.info?.error?.message ||
    err?.shortMessage ||
    err?.reason ||
    err?.message ||
    "Transaction failed"
  );
}

export default function App() {
  const readProvider = useMemo(() => new JsonRpcProvider(LOCAL_RPC), []);
  const readContract = useMemo(
    () => new Contract(contractInfo.address, contractInfo.abi, readProvider),
    [readProvider]
  );

  const [account, setAccount] = useState(null);
  const [writeContract, setWriteContract] = useState(null);
  const [roles, setRoles] = useState({ admin: false, developer: false, verifier: false });
  const [tab, setTab] = useState("Marketplace");

  const [projects, setProjects] = useState([]);
  const [retirements, setRetirements] = useState([]);
  const [balances, setBalances] = useState({});
  const [communityEarned, setCommunityEarned] = useState(0n);
  const [status, setStatus] = useState(null); // { type: "ok" | "err" | "busy", text }
  const [certificate, setCertificate] = useState(null);

  // ---------------------------------------------------------------- data
  const refresh = useCallback(async () => {
    try {
      const [ps, rs, sold] = await Promise.all([
        readContract.getAllProjects(),
        readContract.getAllRetirements(),
        readContract.queryFilter(readContract.filters.CreditsSold()),
      ]);
      setProjects(ps);
      setRetirements(rs.map((r, i) => ({ ...r.toObject(), id: i })));
      setCommunityEarned(sold.reduce((sum, e) => sum + e.args.communityPaid, 0n));

      if (account) {
        const b = {};
        for (const p of ps) b[p.id] = await readContract.balanceOf(account, p.id);
        setBalances(b);
      }
    } catch (err) {
      setStatus({
        type: "err",
        text: "Can't reach the local blockchain. Start it with `npx hardhat node` and run `npm run deploy:local`.",
      });
    }
  }, [readContract, account]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------------------------------------------------------------- wallet
  async function connect() {
    if (!window.ethereum) {
      setStatus({ type: "err", text: "MetaMask not found. Install it to send transactions." });
      return;
    }
    try {
      const chainHex = "0x" + contractInfo.chainId.toString(16);
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
      } catch {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainHex,
            chainName: "Hardhat Local",
            rpcUrls: [LOCAL_RPC],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      }
      const provider = new BrowserProvider(window.ethereum);
      provider.pollingInterval = 1000; // local chain: confirm transactions quickly
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAccount(addr);
      setWriteContract(new Contract(contractInfo.address, contractInfo.abi, signer));

      const [adminRole, devRole, verRole] = await Promise.all([
        readContract.DEFAULT_ADMIN_ROLE(),
        readContract.DEVELOPER_ROLE(),
        readContract.VERIFIER_ROLE(),
      ]);
      const [admin, developer, verifier] = await Promise.all([
        readContract.hasRole(adminRole, addr),
        readContract.hasRole(devRole, addr),
        readContract.hasRole(verRole, addr),
      ]);
      setRoles({ admin, developer, verifier });
      setStatus(null);
    } catch (err) {
      setStatus({ type: "err", text: errorMessage(err) });
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const onChange = () => connect();
    window.ethereum.on?.("accountsChanged", onChange);
    return () => window.ethereum.removeListener?.("accountsChanged", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(label, fn) {
    if (!writeContract) {
      setStatus({ type: "err", text: "Connect your wallet first." });
      return false;
    }
    try {
      setStatus({ type: "busy", text: `${label}…` });
      const tx = await fn(writeContract);
      await tx.wait();
      setStatus({ type: "ok", text: `${label}: done ✔` });
      await refresh();
      return true;
    } catch (err) {
      setStatus({ type: "err", text: `${label} failed: ${errorMessage(err)}` });
      return false;
    }
  }

  // ---------------------------------------------------------------- stats
  const totals = projects.reduce(
    (t, p) => ({
      issued: t.issued + p.totalIssued,
      listed: t.listed + p.listedAmount,
      retired: t.retired + p.totalRetired,
    }),
    { issued: 0n, listed: 0n, retired: 0n }
  );

  return (
    <div className="app">
      <header>
        <div>
          <h1>🌍 KaboniChain</h1>
          <p className="tagline">Transparent carbon credits for Kenya · SDG 13 Climate Action</p>
        </div>
        <div className="wallet">
          {account ? (
            <>
              <span className="addr">{short(account)}</span>
              {roles.admin && <span className="badge">Admin</span>}
              {roles.developer && <span className="badge">Developer</span>}
              {roles.verifier && <span className="badge">Verifier</span>}
            </>
          ) : (
            <button onClick={connect}>Connect wallet</button>
          )}
        </div>
      </header>

      <section className="stats">
        <Stat label="Credits issued" value={`${totals.issued} t`} />
        <Stat label="For sale" value={`${totals.listed} t`} />
        <Stat label="Retired (burned)" value={`${totals.retired} t`} />
        <Stat label="Paid to communities" value={`${formatEther(communityEarned)} ETH`} />
      </section>

      {status && <div className={`status ${status.type}`}>{status.text}</div>}

      <nav>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <main>
        {tab === "Marketplace" && <Marketplace projects={projects} send={send} />}
        {tab === "My Credits" && (
          <MyCredits projects={projects} balances={balances} account={account} send={send} />
        )}
        {tab === "Developer" && (
          <Developer projects={projects} account={account} isDev={roles.developer} send={send} />
        )}
        {tab === "Verifier" && <Verifier projects={projects} isVerifier={roles.verifier} send={send} />}
        {tab === "Retirement Registry" && (
          <Registry retirements={retirements} projects={projects} onView={setCertificate} />
        )}
      </main>

      {certificate && (
        <Certificate r={certificate} projects={projects} onClose={() => setCertificate(null)} />
      )}

      <footer>
        Contract {short(contractInfo.address)} · 1 token = 1 tonne CO₂e · Sample data for demonstration
      </footer>
    </div>
  );
}

// ==================================================================== pieces

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ProjectHeader({ p }) {
  return (
    <>
      <div className="card-top">
        <h3>{p.name}</h3>
        <span className={`pill ${p.verified ? "ok" : "pending"}`}>
          {p.verified ? "Verified" : "Awaiting verification"}
        </span>
      </div>
      <p className="muted">
        {p.projectType} · {p.location}
      </p>
    </>
  );
}

function Marketplace({ projects, send }) {
  const [qty, setQty] = useState({});
  const listed = projects.filter((p) => p.verified && p.pricePerTonne > 0n);
  if (!listed.length) return <p className="muted">No credits are listed for sale yet.</p>;

  return (
    <div className="grid">
      {listed.map((p) => {
        const n = BigInt(qty[p.id] || 0);
        const cost = n * p.pricePerTonne;
        return (
          <div className="card" key={p.id}>
            <ProjectHeader p={p} />
            <dl>
              <dt>Price</dt><dd>{formatEther(p.pricePerTonne)} ETH / tonne</dd>
              <dt>Available</dt><dd>{p.listedAmount.toString()} t</dd>
              <dt>Community share</dt><dd>{pct(p.communityShareBps)} of every sale</dd>
              <dt>Retired so far</dt><dd>{p.totalRetired.toString()} t</dd>
              <dt>Verified by</dt><dd className="mono">{short(p.verifier)}</dd>
            </dl>
            <div className="row">
              <input
                type="number" min="1" placeholder="Tonnes"
                value={qty[p.id] || ""}
                onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })}
              />
              <button
                disabled={!n || p.listedAmount === 0n}
                onClick={() =>
                  send(`Buying ${n} t`, (c) => c.buyCredits(p.id, n, { value: cost }))
                }
              >
                Buy {n ? `(${formatEther(cost)} ETH)` : ""}
              </button>
            </div>
            {n > 0n && (
              <p className="muted small">
                → {formatEther((cost * p.communityShareBps) / 10000n)} ETH goes straight to the community wallet
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MyCredits({ projects, balances, account, send }) {
  const [form, setForm] = useState({});
  if (!account) return <p className="muted">Connect your wallet to see your credits.</p>;
  const owned = projects.filter((p) => (balances[p.id] || 0n) > 0n);
  if (!owned.length) return <p className="muted">You don't hold any credits yet. Buy some in the Marketplace.</p>;

  return (
    <div className="grid">
      {owned.map((p) => {
        const f = form[p.id] || {};
        return (
          <div className="card" key={p.id}>
            <ProjectHeader p={p} />
            <p className="big">{balances[p.id].toString()} t</p>
            <h4>Retire credits (offset emissions)</h4>
            <p className="muted small">Retiring burns the tokens permanently, so they can never be sold or claimed again.</p>
            <input
              type="number" min="1" placeholder="Tonnes to retire"
              value={f.amount || ""}
              onChange={(e) => setForm({ ...form, [p.id]: { ...f, amount: e.target.value } })}
            />
            <input
              placeholder="Beneficiary, e.g. Acme Ltd – 2026 emissions"
              value={f.beneficiary || ""}
              onChange={(e) => setForm({ ...form, [p.id]: { ...f, beneficiary: e.target.value } })}
            />
            <button
              className="danger"
              disabled={!f.amount || !f.beneficiary}
              onClick={async () => {
                const ok = await send(`Retiring ${f.amount} t`, (c) =>
                  c.retireCredits(p.id, BigInt(f.amount), f.beneficiary)
                );
                if (ok) setForm({ ...form, [p.id]: {} });
              }}
            >
              Retire 🔥
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Developer({ projects, account, isDev, send }) {
  const empty = { name: "", location: "", projectType: "", metadataURI: "", community: "", share: "40" };
  const [f, setF] = useState(empty);
  const [list, setList] = useState({});
  if (!isDev) return <p className="muted">Connect with a <b>Developer</b> account (Hardhat account #1) to use this page.</p>;

  const mine = projects.filter((p) => p.developer.toLowerCase() === account.toLowerCase());
  const field = (k, label, ph) => (
    <label>
      {label}
      <input value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );

  return (
    <div className="two-col">
      <div className="card">
        <h3>Register a new project</h3>
        {field("name", "Project name", "e.g. Machakos Biogas")}
        {field("location", "Location", "e.g. Machakos County, Kenya")}
        {field("projectType", "Type", "e.g. Biogas, Reforestation")}
        {field("metadataURI", "Documents link (IPFS)", "ipfs://…")}
        {field("community", "Community wallet address", "0x…")}
        {field("share", "Community share (%)", "40")}
        <button
          onClick={async () => {
            const ok = await send("Registering project", (c) =>
              c.registerProject(f.name, f.location, f.projectType, f.metadataURI, f.community,
                Math.round(Number(f.share) * 100))
            );
            if (ok) setF(empty);
          }}
        >
          Register
        </button>
      </div>

      <div>
        <h3>My projects</h3>
        {!mine.length && <p className="muted">None yet.</p>}
        {mine.map((p) => {
          const l = list[p.id] || {};
          return (
            <div className="card" key={p.id}>
              <ProjectHeader p={p} />
              <p className="muted small">
                Issued {p.totalIssued.toString()} t · Listed {p.listedAmount.toString()} t · Retired {p.totalRetired.toString()} t
              </p>
              {p.verified && (
                <div className="row">
                  <input type="number" placeholder="Tonnes" value={l.amount || ""}
                    onChange={(e) => setList({ ...list, [p.id]: { ...l, amount: e.target.value } })} />
                  <input type="number" step="0.001" placeholder="ETH / tonne" value={l.price || ""}
                    onChange={(e) => setList({ ...list, [p.id]: { ...l, price: e.target.value } })} />
                  <button
                    disabled={!l.amount || !l.price}
                    onClick={() =>
                      send("Listing credits", (c) => c.listForSale(p.id, BigInt(l.amount), parseEther(l.price)))
                    }
                  >
                    List
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Verifier({ projects, isVerifier, send }) {
  const [tonnes, setTonnes] = useState({});
  if (!isVerifier) return <p className="muted">Connect with a <b>Verifier</b> account (Hardhat account #2) to use this page.</p>;
  const pending = projects.filter((p) => !p.verified);
  if (!pending.length) return <p className="muted">No projects are waiting for verification.</p>;

  return (
    <div className="grid">
      {pending.map((p) => (
        <div className="card" key={p.id}>
          <ProjectHeader p={p} />
          <dl>
            <dt>Developer</dt><dd className="mono">{short(p.developer)}</dd>
            <dt>Community wallet</dt><dd className="mono">{short(p.communityWallet)}</dd>
            <dt>Community share</dt><dd>{pct(p.communityShareBps)}</dd>
            <dt>Documents</dt><dd className="mono small">{p.metadataURI || "—"}</dd>
          </dl>
          <p className="muted small">Review the project documents, then issue the verified tonnes of CO₂e.</p>
          <div className="row">
            <input type="number" placeholder="Verified tonnes" value={tonnes[p.id] || ""}
              onChange={(e) => setTonnes({ ...tonnes, [p.id]: e.target.value })} />
            <button disabled={!tonnes[p.id]}
              onClick={() => send("Verifying & issuing", (c) => c.verifyAndIssue(p.id, BigInt(tonnes[p.id])))}>
              Verify & issue
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Registry({ retirements, projects, onView }) {
  if (!retirements.length) return <p className="muted">No credits have been retired yet.</p>;
  const name = (id) => projects.find((p) => p.id === id)?.name || `Project ${id}`;
  return (
    <div className="card">
      <h3>Public retirement registry</h3>
      <p className="muted small">Every retired tonne is burned on-chain and listed here, so anyone can check a company's offset claim.</p>
      <table>
        <thead>
          <tr><th>#</th><th>Project</th><th>Tonnes</th><th>Beneficiary</th><th>Retired by</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>
          {[...retirements].reverse().map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{name(r.projectId)}</td>
              <td>{r.amount.toString()}</td>
              <td>{r.beneficiary}</td>
              <td className="mono">{short(r.retiredBy)}</td>
              <td>{new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
              <td><button className="link" onClick={() => onView(r)}>Certificate</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Certificate({ r, projects, onClose }) {
  const p = projects.find((x) => x.id === r.projectId);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="certificate" onClick={(e) => e.stopPropagation()}>
        <p className="cert-kicker">Carbon Credit Retirement Certificate</p>
        <h2>{r.amount.toString()} tonnes CO₂e</h2>
        <p>retired on behalf of</p>
        <h3>{r.beneficiary}</h3>
        <dl>
          <dt>Project</dt><dd>{p?.name}</dd>
          <dt>Location</dt><dd>{p?.location}</dd>
          <dt>Retirement ID</dt><dd>#{r.id}</dd>
          <dt>Retired by</dt><dd className="mono">{r.retiredBy}</dd>
          <dt>Date</dt><dd>{new Date(Number(r.timestamp) * 1000).toLocaleString()}</dd>
          <dt>Contract</dt><dd className="mono">{contractInfo.address}</dd>
        </dl>
        <p className="muted small">These credits were burned on-chain and can never be sold or claimed again.</p>
        <div className="row no-print">
          <button onClick={() => window.print()}>Print / Save PDF</button>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
