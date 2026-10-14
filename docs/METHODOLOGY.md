# 📐 Ruas Mathematical & Algorithmic Methodology

This document outlines the theoretical foundations, mathematical formulations, and algorithmic specifications implemented in **Ruas**.

---

## 1. Bayesian Credible Edge Confidence

### 1.1 Beta-Bernoulli Conjugate Model

Unlike static heuristic linkers that assign binary or ad-hoc weights to code edges, Ruas models reference resolution confidence as a parameter $\theta \in [0, 1]$ governed by a Beta distribution prior:

$$\theta \sim \text{Beta}(\alpha, \beta)$$

Where the probability density function is:

$$f(\theta; \alpha, \beta) = \frac{\theta^{\alpha - 1} (1 - \theta)^{\beta - 1}}{\text{B}(\alpha, \beta)}$$

When an evidential rule $e$ evaluates a reference (e.g. `same_scope`, `exact_import`, `unique_candidate`), it updates the pseudo-counts $(\alpha, \beta)$:

- **`exact_import`:** $\alpha = 10, \beta = 0.5 \implies \mathbb{E}[\theta] = \frac{10}{10.5} \approx 0.952$
- **`same_scope`:** $\alpha = 8, \beta = 1.0 \implies \mathbb{E}[\theta] = \frac{8}{9} \approx 0.889$
- **`unique_candidate`:** $\alpha = 6, \beta = 2.0 \implies \mathbb{E}[\theta] = \frac{6}{8} = 0.750$
- **`ambiguous_candidates` ($K$ candidates):** $\alpha = 2, \beta = 2K \implies \mathbb{E}[\theta] = \frac{2}{2 + 2K}$

### 1.2 95% Credible Interval Computation

For decision-making and AI agent blast radius warnings, Ruas calculates the symmetric 95% Bayesian credible interval $[\theta_{\text{lower}}, \theta_{\text{upper}}]$.

Under Gaussian approximation for $\alpha + \beta \ge 10$:

$$\sigma^2 = \text{Var}(\theta) = \frac{\alpha \beta}{(\alpha + \beta)^2 (\alpha + \beta + 1)}$$

$$\theta_{\text{lower}} = \max\left(0, \mu - 1.96 \sigma\right), \quad \theta_{\text{upper}} = \min\left(1, \mu + 1.96 \sigma\right)$$

Where $\mu = \frac{\alpha}{\alpha + \beta}$.

---

## 2. Expected Calibration Error (ECE)

To guarantee that edge confidence values reflect true empirical probabilities rather than overconfident hallucinations, Ruas validates edge priors using the Expected Calibration Error (ECE):

1. The interval $[0, 1]$ is partitioned into $M = 10$ bins $B_1, \dots, B_M$.
2. For each bin $B_m$, the empirical accuracy and average confidence are:

$$\text{acc}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} y_i, \quad \text{conf}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} \hat{p}_i$$

3. The Expected Calibration Error is computed as:

$$\text{ECE} = \sum_{m=1}^M \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$$

**Target Invariant:** $\text{ECE} \le 0.15$ on verified cross-file reference benchmarks.

---

## 3. Multilingual NLP & Morphological Stemming

### 3.1 Nazief-Adriani Morphological Stemmer

Production codebases in Southeast Asia frequently contain mixed-language identifiers (e.g., `hitungDiskonPelanggan`, `prosesPembayaranQRIS`, `validasiNomorNPWP`). To match colloquial or natural queries without heavy neural vectors, Ruas implements a clean-room Indonesian stemmer:

1. **Particle Inflexion Removal:** Strips suffixes `-lah`, `-kah`, `-pun`, `-tah`.
2. **Possessive Pronoun Inflexion Removal:** Strips suffixes `-ku`, `-mu`, `-nya`.
3. **Derivational Suffix Removal:** Strips `-kan`, `-an`, `-i`.
4. **Derivational Prefix Removal (Disambiguation Rules):**
   - `meng-` + `vowel` $\implies k$ or $\emptyset$ (e.g. *mengambil* $\to$ *ambil*, *mengirim* $\to$ *kirim*)
   - `meny-` + `vowel` $\implies s$ (e.g. *menyimpan* $\to$ *simpan*)
   - `mem-` + `p` $\implies p$ (e.g. *memproses* $\to$ *proses*)
   - `pen-` / `peng-` $\implies$ noun agent to base verb (e.g. *pembayaran* $\to$ *bayar*, *pengiriman* $\to$ *kirim*)
5. **Root Word Verification:** Checked against an embedded dictionary of root words.

### 3.2 Subword Identifier Splitting

Identifiers are decomposed into subword tokens across snake_case, camelCase, PascalCase, and acronyms:

$$\text{"parseHTTPResponse\_v2"} \implies [\text{"parse"}, \text{"http"}, \text{"response"}, \text{"v"}, \text{"2"}]$$

---

## 4. Personalized PageRank (PPR) Graph Propagation

Given a query, lexical BM25 seed nodes $S$ are selected. Probability mass is diffused through the directed code property graph via power iteration:

$$\mathbf{p}^{(t+1)} = (1 - d) \mathbf{s} + d \left( \mathbf{P}^T \mathbf{p}^{(t)} + \left( \sum_{i \in \text{dangling}} p_i^{(t)} \right) \mathbf{s} \right)$$

Where:
- $d = 0.50$: Damping factor calibrated for code search (prevents graph hubs from overpowering specific lexical matches).
- $\mathbf{s}$: Normalized personalization seed vector derived from BM25 ranks ($s_i = \frac{1 / (r_i + 1)}{\sum_j 1 / (r_j + 1)}$).
- $\mathbf{P}_{ij}$: Transition probability matrix weighted by Bayesian edge confidence $\frac{\alpha}{\alpha + \beta}$ and edge kind multipliers.
- Iterations terminate when $\|\mathbf{p}^{(t+1)} - \mathbf{p}^{(t)}\|_1 < 10^{-5}$ or $t \ge 20$.

---

## 5. Calibrated Weighted Reciprocal Rank Fusion (RRF)

To fuse heterogeneous retrieval signals without arbitrary score normalization, Ruas employs Weighted Reciprocal Rank Fusion:

$$\text{RRF}(d) = \sum_{m \in M} w_m \cdot \frac{1}{k + r_m(d)}$$

Where:
- $k = 60$ (standard smoothing constant).
- $r_m(d)$: 1-based rank position of symbol $d$ in system $m$.
- $w_{\text{bm25}} = 1.0$: Primary lexical evidence.
- $w_{\text{ppr}} = 0.25$: Structural graph connectivity boost.
- $w_{\text{trigram}} = 0.20$: Fuzzy spelling/typo fallback (threshold $\ge 0.65$).

---

## 6. Leiden Community Detection & Subsystem Labeling

### 6.1 Modularity Optimization

To discover natural architectural subsystems and modular boundaries, Ruas runs the Leiden algorithm optimizing directed Newman-Girvan modularity:

$$Q = \frac{1}{2m} \sum_{i,j} \left[ A_{ij} - \gamma \frac{k_i^{\text{out}} k_j^{\text{in}}}{2m} \right] \delta(C_i, C_j)$$

Where $\gamma = 1.0$ is the resolution parameter.

### 6.2 Stability & Adjusted Rand Index (ARI)

Partition stability across pseudo-random initializations is measured using the Adjusted Rand Index:

$$\text{ARI} = \frac{\sum_{ij} \binom{n_{ij}}{2} - \left[ \sum_i \binom{a_i}{2} \sum_j \binom{b_j}{2} \right] / \binom{n}{2}}{\frac{1}{2} \left[ \sum_i \binom{a_i}{2} + \sum_j \binom{b_j}{2} \right] - \left[ \sum_i \binom{a_i}{2} \sum_j \binom{b_j}{2} \right] / \binom{n}{2}}$$

**Target Invariant:** Mean $\text{ARI} \ge 0.75$ across 10 random seeds.

### 6.3 TF-IDF Subsystem Labeling

For each community $C_k$, AST tokens and docstrings are aggregated into a document $D_k$. Terms are scored via TF-IDF:

$$\text{TF}(t, D_k) = \frac{f_{t, D_k}}{\sum_{w} f_{w, D_k}}, \quad \text{IDF}(t) = \ln\left(1 + \frac{|C|}{|\{C_j : t \in D_j\}|}\right)$$

The top 3 highest-scoring terms generate human-readable module labels (e.g. `payment:qris:settlement`, `logistics:shipping:waybill`) with zero external LLM API dependency.

---

## 7. Incremental Merkle Invariant

Ruas computes a cryptographic SHA-256 Merkle tree over project files. The incremental indexing invariant is defined as:

$$\forall \text{ state } S_1 \xrightarrow{\text{mutations}} S_2: \quad \text{Graph}_{\text{incremental}}(S_2) \equiv \text{Graph}_{\text{cold}}(S_2)$$

This invariant is verified by continuous property-based automated tests across file creations, modifications, and deletions.
