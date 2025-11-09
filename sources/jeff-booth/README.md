# Jeff Booth Voice Framework — Master Guide

This directory contains everything you need to write in Jeff Booth's voice for Buoy Bitcoin content. Use these resources to make complex Bitcoin concepts feel clear, logical, and empowering.

---

## Quick Start

**New to this framework?** Read in this order:

1. **`voice-patterns.md`** — Learn Jeff's 6 core explanation structures (15 min read)
2. **`jeff-analogies.md`** — Browse the analogy catalog; pick 2–3 you like (10 min)
3. **`sample-explanations.md`** — Read 2 full templates relevant to what you're writing (15 min)
4. **Start writing** — Use the patterns and templates; refine as you go

**Already familiar?** Jump to the file that solves your current problem:
- Writing a service page? → `sample-explanations.md`
- Need a metaphor? → `jeff-analogies.md`
- Stuck on structure? → `voice-patterns.md`
- Handling objections? → `common-objections.md`

---

## File Overview

### Core Framework Files

#### **`voice-patterns.md`**
Jeff's 6 rhetorical structures and sentence-level patterns.

**Contains:**
- Pattern 1: Mechanism → Artifact → Choice
- Pattern 2: Analogy → Expand → Connect
- Pattern 3: Common Belief → Mechanism → Truth
- Pattern 4: Cascade Logic (If X → Then Y → Then Z)
- Pattern 5: Reframe the Observer
- Pattern 6: Personal Accountability ("It's Not Them—It's Us")
- Sentence-level patterns (openings, transitions, emphasis, closings)
- Voice principles summary
- Anti-patterns (what Jeff never does)

**Use when:**
- You're not sure how to structure an explanation
- Your writing feels too choppy or template-like
- You need to explain a complex mechanism
- You want to understand Jeff's "feel"

---

#### **`jeff-analogies.md`**
Catalog of Jeff's metaphors organized by concept, with full 2–4 sentence versions.

**Contains:**
- Paper folding → Exponential growth
- Bakery + always-on buyer → Energy markets
- Monopoly game → Wealth concentration
- Debt = Money → Ponzi structure
- Cyber hornets → Antifragility
- Two different realities → Observer effect
- (Plus 15+ more)

**Use when:**
- You need to explain an abstract concept to beginners
- You want a concrete example everyone can grasp
- You're writing educational content or guides
- You need to make counterintuitive ideas click

---

#### **`sample-explanations.md`**
Full paragraph templates for common Bitcoin concepts in Jeff's style.

**Contains:**
Templates for:
- Self-custody (why it matters)
- Deflation (why it's good)
- Lightning Network (scaling in layers)
- Bitcoin mining (energy as security)
- Dollar-cost averaging (DCA)
- "Not your keys, not your coins"
- Re-centralization traps

**Use when:**
- Writing service descriptions
- Creating educational guides
- You need a starting point for a complex topic
- You want to see a complete Jeff-style explanation

---

#### **`common-objections.md`**
How Jeff handles the most frequent Bitcoin/deflation objections.

**Contains:**
Objection-handling patterns for:
- "Deflation means people won't spend"
- "Bitcoin wastes energy"
- "Bitcoin is too volatile"
- "Government will ban it"
- "We need jobs—deflation causes unemployment"
- "Bitcoin is only for criminals"
- "Bitcoin already failed"

**Use when:**
- Writing FAQ sections
- Addressing user concerns in service pages
- Creating educational content that preempts doubts
- You need to respond to skepticism without being defensive

---

### Source Material

#### **`book-excerpts.md`** (60KB)
Chapters from *The Price of Tomorrow*. Rich source material showing Jeff's long-form explanation style.

**Use when:**
- You need more context on a concept
- You want to see how Jeff develops an idea across pages
- You're looking for new analogies or frameworks

---

#### **`interviews/`** directory
Full transcripts of Jeff's podcast/video interviews.

**Files:**
- `interviews-austria.md` — Agenda Austria interview (deep dive on deflation)
- `interviews-financejunkies.md` — Finance Junkies interview (credit system mechanics)
- (More may be added)

**Use when:**
- You want to hear Jeff's conversational voice
- You need examples of how he responds in real-time
- You're looking for specific topics or phrasings

---

#### **`articles/`** directory
Jeff's written articles (longer, more polished than interviews).

**Files:**
- `finding-signal.md` — Bitcoin vs. altcoins; protocol layers
- `greatest-game.md` — The transition from fiat to Bitcoin

**Use when:**
- You want Jeff's most refined thinking on a topic
- You need structured arguments for complex concepts
- You're writing something longer and more contemplative

---

#### **`core-concepts.md`**
High-level framework: key principles, scoring rubrics, voice snippets.

**Use when:**
- You need a quick refresher on Jeff's philosophy
- You're evaluating a service (sovereignty score, etc.)
- You want approved one-liner snippets

---

## How to Use This Framework

### For Service Pages

1. **Start with `sample-explanations.md`**
   - Find the template closest to your topic (e.g., self-custody, Lightning)
   - Copy the 3–4 paragraph structure

2. **Adapt to your service**
   - Replace generic examples with service-specific features
   - Keep the mechanism → consequence → action flow
   - Don't shorten—let the explanation breathe

3. **Add one analogy** (from `jeff-analogies.md`)
   - Pick one that fits the service's key feature
   - Use the full 2–4 sentence version
   - Place it where the concept is hardest to grasp

4. **Check against `voice-patterns.md`**
   - Does it build to the conclusion or state it upfront?
   - Did you use "which means..." / "and so..." transitions?
   - Did you end with user agency ("You can...")?

5. **Review tone**
   - Read it aloud—does it sound like Jeff talking?
   - Remove any "Trade-off: X → Y" choppy templates
   - Add empathy where you're asking users to change behavior

---

### For Educational Guides

1. **Pick your structure** from `voice-patterns.md`
   - **Pattern 3** (Common Belief → Mechanism → Truth) works well for "What is..." content
   - **Pattern 1** (Mechanism → Artifact → Choice) works well for "How to..." content
   - **Pattern 2** (Analogy → Expand → Connect) works well for complex concepts

2. **Use multiple analogies** from `jeff-analogies.md`
   - One per major section
   - Don't stack them—space them out
   - Always connect back to the main concept

3. **Address objections** proactively
   - Check `common-objections.md` for relevant concerns
   - Weave them in as "You might be wondering..." sections
   - Never dismiss—acknowledge, then reframe

4. **Stage the journey** (from writing-guide.mdc)
   - Acquire → Withdraw → Verify → Transact → Graduate
   - Show where the reader is and what's next
   - Link to relevant how-tos

---

### For Compare Pages

1. **Lead with sovereignty** (from `core-concepts.md`)
   - Score: Custody (40%), Transparency (20%), Resilience (15%), Usability (15%), Alignment (10%)
   - Sort services by total score before UX polish

2. **Use consistent language** from `sample-explanations.md`
   - "Custodial (they hold keys). Fast signup; introduces withdrawal and rehypothecation risk."
   - "Self-custody (you hold keys). No counterparty risk."

3. **Flag re-centralization traps** (from `common-objections.md`)
   - Custodial yield, ETFs, wrapped BTC, Bitcoin-backed loans
   - Use the warning pattern: "Re-centralization risk: [Feature] introduces [counterparty/liquidation/freeze] risk. Exit path: [Link]"

4. **Add btc-lens notes**
   - "Fees and frictions tend to shrink in sats over time."
   - "Measured in Bitcoin, this service's value is..."

---

### For FAQs

1. **Source from `common-objections.md`**
   - Use Jeff's 5-step pattern:
     1. Acknowledge the concern
     2. Reframe from first principles
     3. Use examples they already know
     4. Show the current system's harm
     5. End with agency

2. **Keep the conversational flow**
   - Write like Jeff is answering the question
   - Don't abbreviate to save space
   - 3–5 sentences minimum per answer

3. **Link to deeper content**
   - FAQ = entry point
   - Link to full guides for "Learn more"
   - Use analogies from `jeff-analogies.md` to make answers stick

---

## Voice Principles (Checklist)

Before publishing any content, check:

- [ ] **Mechanism before conclusion** — Did I explain *how* before stating *what*?
- [ ] **Natural sentences** — Does it flow conversationally, not choppy templates?
- [ ] **User agency** — Did I end with "You can choose..." not "You should..."?
- [ ] **Empathy** — Did I acknowledge why someone might think differently?
- [ ] **Concrete examples** — Did I use analogies/examples people already understand?
- [ ] **No smugness** — Did I avoid "HFSP" / "You're wrong" / condescension?
- [ ] **Clear exits** — Did I link to how-tos for self-custody, withdrawal, etc.?
- [ ] **Measure in sats** — Did I show Bitcoin-lens where helpful?

---

## Common Mistakes

### ❌ Template-Speak
**Bad:** "Trade-off: Speed → KYC risk. Exit: Manual verification."
**Good:** "Faster onboarding comes with KYC requirements and withdrawal limits. Decide if the convenience is worth it for you. You can minimize reuse and rotate addresses to reduce exposure."

### ❌ Stating Conclusions Upfront
**Bad:** "Bitcoin is the solution to inflation. Here's why..."
**Good:** "The existing credit-based system can't allow deflation without collapse. That's why central banks must print money, which pushes prices up artificially. Bitcoin removes that manipulation by..."

### ❌ One-Sentence Explanations
**Bad:** "Self-custody means you control your keys."
**Good:** [Use the 3-paragraph template from `sample-explanations.md`]

### ❌ Directives Instead of Options
**Bad:** "Set this up before your first buy rather than waiting."
**Good:** "You can pair this with auto-withdraw to move sats automatically, or manage withdrawals manually depending on what fits your needs."

### ❌ Blaming "Them"
**Bad:** "Central banks are stealing your wealth."
**Good:** "The system requires inflation to survive. Every time you try to make more money within that system, you're feeding it. You can move your time to Bitcoin instead."

---

## Maintenance

### Adding New Source Material

When you find new Jeff content (podcasts, articles, tweets):

1. **Add transcript/content** to appropriate directory
   - Interviews → `/interviews/`
   - Articles → `/articles/`
   - Book chapters → append to `book-excerpts.md`

2. **Extract new patterns**
   - New analogies → add to `jeff-analogies.md`
   - New objection responses → add to `common-objections.md`
   - New explanation structures → add to `voice-patterns.md`

3. **Update this README** if you've added a new file

---

## Quick Reference

**Most-used files (bookmark these):**

1. `voice-patterns.md` — Structure and flow
2. `sample-explanations.md` — Copy-paste starting points
3. `jeff-analogies.md` — Concrete examples
4. `common-objections.md` — FAQ responses

**Rarely needed (but good to know they exist):**

- `book-excerpts.md` — Deep research
- `interviews/` — Hearing Jeff's actual voice
- `articles/` — Long-form essay structure
- `core-concepts.md` — High-level philosophy

---

## Questions?

If you're stuck or unsure:

1. **Read a sample explanation** that's close to your topic
2. **Find an analogy** that fits the concept
3. **Use Pattern 1** (Mechanism → Artifact → Choice) as default structure
4. **Read it aloud** — if it doesn't sound like Jeff talking, revise

The goal isn't to mimic Jeff word-for-word. It's to **capture his patient, mechanism-first, empowering explanation style** so Buoy content feels like a friend explaining Bitcoin over coffee—not a template spitting out bullet points.

---

**Last updated:** 2025-11-09
**Maintainer:** Buoy content team

