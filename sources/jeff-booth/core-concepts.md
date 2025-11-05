# Jeff Booth's Bitcoin Vision — Core Concepts (for Buoy Bitcoin)

> “Technology is deflationary.” 
> “The natural state of the free market is deflation.” 

This file is your compass. Use it to make product and editorial calls without second-guessing. When in doubt, choose what increases individual sovereignty and reduces hidden fragility.

---

## Abundance vs. Scarcity Mindset

**Thesis:** Technology creates *abundance* by driving marginal costs toward zero; fiat systems manufacture *scarcity* via credit expansion and dilution. Your site should celebrate what makes users richer in purchasing power over time, not just “number go up.”
**Implication for Buoy:** Rank and explain services by how they *reduce user dependence on inflationary rails* (self-custody, open standards, interoperability) rather than by hype or short-term promotions.  

---

## Technology as a Deflationary Force

**Core idea:** As software eats costs, prices *should* fall toward marginal cost. That truth applies beyond phones—to finance, energy, and settlement. Build your content assuming deflation is normal and desirable. 
**Voice to use:** Calm, explanatory, optimistic. Remind users that deflation means “more for less,” and that sound money lets society capture those gains.

---

## Monetary System Disconnect

**Reality check:** Our credit-based fiat system *cannot* allow broad price deflation without risking systemic collapse; it must respond with more credit, regulation, and control. Don’t moralize—explain the mechanism clearly and simply. 
**Implication for Buoy:** Be explicit when a feature leans on fiat rails or custodial rehypothecation. Label the counterparty risk, fees, and potential failure modes.

---

## Bitcoin as a Truth Protocol

**Definition:** A decentralized, energy-bounded ledger with rules that do not bend to political expediency. If it stays decentralized and secure, it measures the free market accurately: *prices fall in bitcoin terms over time.* 
**Editorial stance:** Treat Bitcoin as *infrastructure*, not an investment product. Evaluate services by how well they honor the properties that make Bitcoin valuable (decentralization, permissionless access, verifiability).

---

## Time Preference & Sovereignty

**Low time preference:** Sound money reduces the need for frantic yield-chasing and status games. The goal is more time with loved ones, less treadmill.
**Buoy’s UX:** Remove choice overload. Default to the safest path for a newcomer to gain sovereignty in stages.

---

## Practical Frameworks for Service Evaluation

### 1) Custody Model (first, always)

* **Self-custody (preferred):** No counterparty risk; aligns with Bitcoin’s purpose. Highlight clear seed/back-up flows, PSBT support, hardware compatibility.
* **Assisted self-custody:** Multi-sig with a coordinator where the user keeps a key. Good bridge for beginners—explain recovery trade-offs plainly.
* **Custodial (last resort):** Map risks: rehypothecation, withdrawal limits, KYC honeypots, geo-freeze, opaque reserves. Encourage exit ramps to self-custody.
  *Rationale:* Only self-custody removes the systemic risks created by credit expansion. “If you held it in self-custody… the only thing without counterparty risk.” 

### 2) Centralization vs. Convenience

Every convenience can add a choke point. Score features along two axes:

* **User freedom:** keys, node connectivity, coin control, payjoin/coinjoin support.
* **Fragility:** dependence on a single company, token, or proprietary API.
  Explain plainly when “ease of use” is bought with surveillance or censorship risk. 

### 3) Lightning Support

* Favor services that **let users bring their own node** (or connect to their own LSP), expose invoices/keys safely, and avoid opaque custodial channels.
* For custodial Lightning, disclose limits, rate-limits, and export paths.
  *Why:* We want payments that inherit Bitcoin’s properties, not walled-garden IOUs.

### 4) DCA (Dollar-Cost Averaging)

* **Positioning:** DCA is a behavioral tool to lower time preference and reduce regret; it’s not a promise of outperformance in fiat terms.
* **Best practice:** DCA → *automatic withdrawal* to self-custody. Prefer services with scheduled auto-withdrawals, batching, and address labeling to reduce fees and errors.
  *Reasoning:* Moves savings from the control system to the honest ledger, gradually and safely. 

### 5) Bitcoin-Backed Loans

* **Default stance:** Caution. They re-introduce counterparty and liquidation risk and can trap users back into the credit system.
* **If listed:** Require transparent LTV, liquidation process, rehypothecation policy, proof-of-reserves (per-user), jurisdiction, and emergency redemption paths.
* **Education block:** “Loans are a trade: convenience today for optionality risk tomorrow.” Only consider if avoiding taxable disposals is critical *and* you understand the risks.

### 6) Nodes & Verification

* **Running a node:** Encourage as a *graduation step*: verify your own transactions, improve privacy, connect wallet/Lightning, and learn fee markets.
* **Service scoring:** Reward vendors that make it easy to point wallets to a user’s node or offer stateless verification modes.
  *Why:* A user who verifies is a user who won’t be gaslit by price illusions. 

### 7) Country Availability & Compliance

* Be factual and non-judgmental about KYC/AML constraints, but always show the path to sovereignty (cash-like on-ramps where legal, P2P, vouchers).
* Warn about export controls, sanctions, and travel rule impacts where relevant. The mission is informed consent, not bravado.

---

## Product Writing Principles (use across the site)

1. **Simplicity over cleverness:** Explain in one sentence what the user gets, what they give up, and how to exit.
2. **Surface the trade-off:** “More convenience” ↔ “more custody/metadata.” Make the swap explicit.
3. **Stage the journey:** *Acquire → Withdraw → Verify → Spend/Save → Run a node → Help others.*
4. **Always give an escape hatch:** Link to a self-custody guide or exit tutorial from any custodial service page.
5. **Default to human empathy:** People are tired, busy, and anxious. Show them the next safe step, not a lecture.

---

## Scoring Rubric (what Cursor should reinforce in copy & code)

* **Sovereignty (40%)** — keys, node support, exit ramps.
* **Transparency (20%)** — proofs, audits, fee clarity, open-source.
* **Resilience (15%)** — jurisdictional diversity, no single points of failure.
* **Usability (15%)** — beginner-friendly flows that don’t hide risks.
* **Alignment (10%)** — business model aligned with users (no token distractions).

---

## Voice & Tone Snippets (drop-in lines)

* “Choose the path that gives your future self more options, not more obligations.”
* “More for less is normal in a free market; Bitcoin lets you keep those gains.” 
* “If a feature depends on trust in a black box, label it red and show the alternative.”
* “Self-custody is how you opt out of other people’s mistakes.” 

---

## Red Lines (what we won’t promote)

* Yield schemes without per-user, on-chain proofs.
* Tokens or chains that centralize control or add opaque risk layers.
* “Free” features that monetize user identity or custody behind the scenes.

---

## North Star

Our job is not to dazzle people with features. It’s to help them step off the treadmill, keep more of their time, and participate in a system that doesn’t need to lie to function.