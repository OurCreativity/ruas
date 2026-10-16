export interface GraphPayload {
  readonly projectName: string;
  readonly nodes: readonly {
    readonly id: string;
    readonly name: string;
    readonly kind: string;
    readonly file: string;
    readonly startLine: number;
    readonly endLine: number;
    readonly signature: string | null;
    readonly docComment: string | null;
    readonly pprScore: number;
    readonly communityId: number;
    readonly subsystemLabel: string;
  }[];
  readonly edges: readonly {
    readonly id: string;
    readonly srcId: string;
    readonly dstId: string;
    readonly kind: string;
    readonly confidence: number;
    readonly credibleInterval: readonly [number, number];
  }[];
  readonly subsystems: readonly {
    readonly id: number;
    readonly label: string;
    readonly count: number;
    readonly color: string;
  }[];
  readonly stats: {
    readonly totalFiles: number;
    readonly totalNodes: number;
    readonly totalEdges: number;
    readonly totalSubsystems: number;
  };
}

export function renderGraphHtml(payload: GraphPayload): string {
  const dataJson = JSON.stringify(payload).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ruas — Visual Code Intelligence & Architecture Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #07090E;
      --bg-panel: rgba(15, 23, 42, 0.75);
      --bg-card: rgba(30, 41, 59, 0.6);
      --border-glass: rgba(255, 255, 255, 0.08);
      --border-glass-active: rgba(6, 182, 212, 0.4);
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --accent-cyan: #06B6D4;
      --accent-violet: #8B5CF6;
      --accent-emerald: #10B981;
      --accent-rose: #F43F5E;
      --accent-amber: #F59E0B;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }

    #canvas-container {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }

    /* Top HUD Navigation */
    .top-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      height: 60px;
      background: var(--bg-panel);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 20;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
      color: #FFF;
    }

    .brand-badge {
      width: 10px;
      height: 10px;
      background: var(--accent-cyan);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent-cyan);
      animation: pulse-glow 2s infinite ease-in-out;
    }

    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    .project-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      border-left: 1px solid var(--border-glass);
      padding-left: 12px;
    }

    .search-box {
      position: relative;
      width: 320px;
    }

    .search-box input {
      width: 100%;
      padding: 8px 14px 8px 36px;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      color: #FFF;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-box input:focus {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.25);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .fuzzy-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 360px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-glass-active);
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
      max-height: 280px;
      overflow-y: auto;
      z-index: 100;
      display: none;
    }

    .fuzzy-dropdown.active {
      display: block;
    }

    .fuzzy-item {
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s ease;
    }

    .fuzzy-item:last-child {
      border-bottom: none;
    }

    .fuzzy-item:hover {
      background: rgba(6, 182, 212, 0.15);
    }

    .fuzzy-item-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow: hidden;
    }

    .fuzzy-item-name {
      font-weight: 700;
      font-size: 0.85rem;
      color: #FFF;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .fuzzy-item-meta {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    .fuzzy-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(6, 182, 212, 0.2);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.4);
      white-space: nowrap;
    }

    .fuzzy-badge.acronym {
      background: rgba(139, 92, 246, 0.2);
      color: var(--accent-violet);
      border-color: rgba(139, 92, 246, 0.4);
    }

    .hud-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      color: var(--text-main);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:hover {
      background: rgba(51, 65, 85, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }

    .btn-roast {
      background: rgba(244, 63, 94, 0.15);
      border-color: rgba(244, 63, 94, 0.4);
      color: #FDA4AF;
    }

    .btn-roast:hover {
      background: rgba(244, 63, 94, 0.3);
      border-color: var(--accent-rose);
      color: #FFF;
    }

    .btn-roast.active {
      background: var(--accent-rose);
      color: #FFF;
      box-shadow: 0 0 16px rgba(244, 63, 94, 0.5);
    }

    /* Subsystem Legend Panel */
    .legend-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: var(--bg-panel);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      padding: 14px 18px;
      z-index: 20;
      max-width: 280px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }

    .legend-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 700;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 180px;
      overflow-y: auto;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .legend-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .legend-item.dimmed {
      opacity: 0.3;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-label {
      font-family: 'JetBrains Mono', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .legend-count {
      color: var(--text-muted);
      font-size: 0.7rem;
    }

    /* Side Inspector Drawer */
    .inspector-drawer {
      position: absolute;
      top: 92px;
      right: 20px;
      bottom: 20px;
      width: 380px;
      background: var(--bg-panel);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-glass);
      border-radius: 20px;
      padding: 24px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transform: translateX(420px);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -20px 20px 50px rgba(0, 0, 0, 0.6);
      overflow-y: auto;
    }

    .inspector-drawer.open {
      transform: translateX(0);
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .node-title-group {
      flex: 1;
    }

    .node-kind-badge {
      display: inline-block;
      padding: 3px 8px;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--accent-cyan);
      border-radius: 6px;
      font-size: 0.7rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .node-name {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      word-break: break-all;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s ease;
    }

    .close-btn:hover {
      color: #FFF;
      background: rgba(255, 255, 255, 0.1);
    }

    .source-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--accent-cyan);
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
    }

    .signature-card {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: #E2E8F0;
      white-space: pre-wrap;
      word-break: break-all;
      user-select: text;
    }

    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 700;
      margin-top: 4px;
    }

    .links-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 140px;
      overflow-y: auto;
    }

    .link-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      border-radius: 8px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .link-item:hover {
      background: rgba(51, 65, 85, 0.6);
      border-color: var(--accent-cyan);
      transform: translateX(2px);
    }

    .link-item-name {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }

    .link-conf {
      font-size: 0.7rem;
      color: var(--accent-emerald);
      font-family: 'JetBrains Mono', monospace;
    }

    .blast-radius-box {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .blast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--accent-rose);
      font-weight: 700;
      font-size: 0.8rem;
    }

    .blast-desc {
      font-size: 0.75rem;
      color: #FECDD3;
      line-height: 1.4;
    }

    /* Tooltip */
    .tooltip {
      position: absolute;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid var(--accent-cyan);
      color: #FFF;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      pointer-events: none;
      z-index: 100;
      display: none;
      transform: translate(-50%, -120%);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    }
  </style>
</head>
<body>

  <!-- Top HUD -->
  <div class="top-hud">
    <div class="brand-group">
      <div class="brand-logo">
        <div class="brand-badge"></div>
        <span>Ruas</span>
      </div>
      <div class="project-title" id="hud-project-title">Project Graph</div>
    </div>

    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" placeholder="Cari simbol, akronim (misal: pQRIS)..." autocomplete="off">
      <div class="fuzzy-dropdown" id="fuzzy-dropdown"></div>
    </div>

    <div class="hud-controls">
      <button class="btn btn-roast" id="btn-roast-toggle" title="Mode Emotional Damage (sorot titik rawan bencana)">
        ⚡ Emotional Damage
      </button>
      <button class="btn" id="btn-reset-view">
        🎯 Reset View
      </button>
      <button class="btn" id="btn-pause-physics">
        ⏸ Pause
      </button>
    </div>
  </div>

  <!-- Canvas Container -->
  <div id="canvas-container">
    <canvas id="graph-canvas"></canvas>
  </div>

  <!-- Subsystem Legend -->
  <div class="legend-panel">
    <div class="legend-title">
      <span>Sub-sistem (Leiden)</span>
      <span id="legend-count">0</span>
    </div>
    <div class="legend-items" id="legend-list"></div>
  </div>

  <!-- Inspector Side Drawer -->
  <div class="inspector-drawer" id="inspector-drawer">
    <div class="inspector-header">
      <div class="node-title-group">
        <span class="node-kind-badge" id="drawer-kind">function</span>
        <div class="node-name" id="drawer-name">processQrisPayment</div>
      </div>
      <button class="close-btn" id="drawer-close">&times;</button>
    </div>

    <div class="source-meta" id="drawer-source">src/payment/gateway.ts:10-45</div>

    <div class="section-title">Signature & Dokumentasi</div>
    <div class="signature-card" id="drawer-signature">async function processQrisPayment(amount: number): Promise&lt;string&gt;</div>

    <!-- Blast Radius Alert Card -->
    <div class="blast-radius-box" id="drawer-blast-box">
      <div class="blast-header">
        <span>⚡ Dampak Ledakan (Blast Radius)</span>
        <span id="drawer-blast-risk">HIGH</span>
      </div>
      <p class="blast-desc" id="drawer-blast-desc">
        Dipanggil langsung oleh 3 modul. Perubahan signature pada fungsi ini berpotensi memicu galat runtime berantai.
      </p>
    </div>

    <div class="section-title">Pemanggil Masuk (Inbound Callers)</div>
    <div class="links-list" id="drawer-inbound-list"></div>

    <div class="section-title">Panggilan Keluar (Outbound Callees)</div>
    <div class="links-list" id="drawer-outbound-list"></div>
  </div>

  <!-- Tooltip -->
  <div class="tooltip" id="graph-tooltip"></div>

  <!-- Embedded Data -->
  <script>
    window.__RUAS_GRAPH_DATA__ = ${dataJson};
  </script>

  <!-- Interactive Graph Engine -->
  <script>
    (function() {
      const data = window.__RUAS_GRAPH_DATA__;
      document.getElementById('hud-project-title').textContent = data.projectName + " (" + data.stats.totalNodes + " simbol, " + data.stats.totalEdges + " relasi)";
      document.getElementById('legend-count').textContent = data.subsystems.length + " klaster";

      const canvas = document.getElementById('graph-canvas');
      const ctx = canvas.getContext('2d');
      const tooltip = document.getElementById('graph-tooltip');
      const drawer = document.getElementById('inspector-drawer');
      const searchInput = document.getElementById('search-input');
      const btnRoast = document.getElementById('btn-roast-toggle');
      const btnReset = document.getElementById('btn-reset-view');
      const btnPause = document.getElementById('btn-pause-physics');
      const drawerClose = document.getElementById('drawer-close');

      let width = window.innerWidth;
      let height = window.innerHeight;
      let dpr = window.devicePixelRatio || 1;

      function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
      window.addEventListener('resize', resize);
      resize();

      // State
      let transform = { x: width / 2, y: height / 2, k: 1 };
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };
      let hoveredNode = null;
      let selectedNode = null;
      let physicsRunning = true;
      let roastMode = false;
      let filterCommunity = null;
      let searchQuery = "";

      // Palette
      const PALETTE = [
        "#06B6D4", "#8B5CF6", "#10B981", "#EC4899", 
        "#F59E0B", "#3B82F6", "#14B8A6", "#A855F7", 
        "#6366F1", "#F43F5E", "#84CC16", "#0EA5E9"
      ];

      const commColorMap = new Map();
      data.subsystems.forEach((sub, idx) => {
        commColorMap.set(sub.id, PALETTE[idx % PALETTE.length]);
      });

      // Build Graph Nodes
      const nodeMap = new Map();
      const nodes = data.nodes.map((n, i) => {
        const angle = (i / data.nodes.length) * Math.PI * 2;
        const radius = 100 + Math.random() * 250;
        const color = commColorMap.get(n.communityId) || "#06B6D4";
        const nodeObj = {
          ...n,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          r: Math.max(7, Math.min(22, 8 + (n.pprScore || 0) * 80)),
          color,
          inbound: [],
          outbound: [],
        };
        nodeMap.set(n.id, nodeObj);
        return nodeObj;
      });

      // Link Edges
      const edges = data.edges.map(e => {
        const src = nodeMap.get(e.srcId);
        const dst = nodeMap.get(e.dstId);
        if (src && dst) {
          src.outbound.push({ edge: e, target: dst });
          dst.inbound.push({ edge: e, source: src });
        }
        return { ...e, source: src, target: dst };
      }).filter(e => e.source && e.target);

      // Render Subsystem Legend
      const legendList = document.getElementById('legend-list');
      data.subsystems.forEach(sub => {
        const color = commColorMap.get(sub.id) || "#06B6D4";
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = \`
          <span class="legend-dot" style="background: \${color}; box-shadow: 0 0 8px \${color};"></span>
          <span class="legend-label">\${sub.label}</span>
          <span class="legend-count">\${sub.count}</span>
        \`;
        div.addEventListener('click', () => {
          if (filterCommunity === sub.id) {
            filterCommunity = null;
            div.classList.remove('active');
            document.querySelectorAll('.legend-item').forEach(el => el.classList.remove('dimmed'));
          } else {
            filterCommunity = sub.id;
            document.querySelectorAll('.legend-item').forEach(el => {
              el.classList.toggle('dimmed', el !== div);
            });
          }
        });
        legendList.appendChild(div);
      });

      // Physics Simulation (Force-directed)
      function stepPhysics() {
        if (!physicsRunning) return;

        const kRepel = 4000;
        const kSpring = 0.04;
        const centerGravity = 0.02;

        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        // Spring attraction along edges
        for (const e of edges) {
          const dx = e.target.x - e.source.x;
          const dy = e.target.y - e.source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 90;
          const force = (dist - targetDist) * kSpring * (e.confidence || 0.8);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          e.source.vx += fx;
          e.source.vy += fy;
          e.target.vx -= fx;
          e.target.vy -= fy;
        }

        // Center gravity and velocity integration
        for (const n of nodes) {
          n.vx -= n.x * centerGravity;
          n.vy -= n.y * centerGravity;

          n.vx *= 0.88; // damping
          n.vy *= 0.88;

          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // Main Render Loop
      function draw() {
        stepPhysics();

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        // Compute Blast Radius set if node selected or roast mode
        const blastSet = new Set();
        if (selectedNode) {
          blastSet.add(selectedNode.id);
          selectedNode.inbound.forEach(link => blastSet.add(link.source.id));
        }

        // Draw Edges
        for (const e of edges) {
          const isHighlighted = selectedNode && (e.source.id === selectedNode.id || e.target.id === selectedNode.id);
          const isBlastEdge = roastMode && blastSet.has(e.target.id);

          ctx.beginPath();
          ctx.moveTo(e.source.x, e.source.y);
          ctx.lineTo(e.target.x, e.target.y);

          if (isBlastEdge) {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.8)";
            ctx.lineWidth = 2.5;
          } else if (isHighlighted) {
            ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
            ctx.lineWidth = 2.0;
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1.0;
          }
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(e.target.y - e.source.y, e.target.x - e.source.x);
          const arrowDist = e.target.r + 5;
          const ax = e.target.x - Math.cos(angle) * arrowDist;
          const ay = e.target.y - Math.sin(angle) * arrowDist;

          ctx.fillStyle = isBlastEdge ? "#F43F5E" : (isHighlighted ? "#06B6D4" : "rgba(255, 255, 255, 0.2)");
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - Math.cos(angle - 0.4) * 6, ay - Math.sin(angle - 0.4) * 6);
          ctx.lineTo(ax - Math.cos(angle + 0.4) * 6, ay - Math.sin(angle + 0.4) * 6);
          ctx.closePath();
          ctx.fill();
        }

        // Draw Nodes
        for (const n of nodes) {
          const isMatch = searchQuery === "" || n.name.toLowerCase().includes(searchQuery) || n.file.toLowerCase().includes(searchQuery);
          const isCommMatch = filterCommunity === null || n.communityId === filterCommunity;
          const isDimmed = !isMatch || !isCommMatch;

          const isSelected = selectedNode && selectedNode.id === n.id;
          const isHovered = hoveredNode && hoveredNode.id === n.id;
          const isBlast = roastMode && blastSet.has(n.id);

          ctx.save();
          ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

          // Glowing halo
          if (isSelected || isBlast || isHovered) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 7, 0, Math.PI * 2);
            ctx.fillStyle = isBlast ? "rgba(244, 63, 94, 0.35)" : "rgba(6, 182, 212, 0.35)";
            ctx.fill();
          }

          // Node body
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = isBlast ? "#F43F5E" : n.color;
          ctx.fill();
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.strokeStyle = isSelected ? "#FFF" : "rgba(255, 255, 255, 0.3)";
          ctx.stroke();

          // Node Label
          if (transform.k > 0.65 || isSelected || isHovered) {
            ctx.font = (isSelected ? "bold 12px" : "10px") + " 'JetBrains Mono', monospace";
            ctx.fillStyle = isSelected ? "#FFF" : "rgba(248, 250, 252, 0.85)";
            ctx.textAlign = "center";
            ctx.fillText(n.name, n.x, n.y + n.r + 14);
          }

          ctx.restore();
        }

        ctx.restore();
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);

      // Coordinates helper
      function screenToWorld(sx, sy) {
        return {
          x: (sx - transform.x) / transform.k,
          y: (sy - transform.y) / transform.k,
        };
      }

      function findNodeAt(sx, sy) {
        const { x, y } = screenToWorld(sx, sy);
        for (let i = nodes.length - 1; i >= 0; i--) {
          const n = nodes[i];
          const dx = n.x - x;
          const dy = n.y - y;
          if (dx * dx + dy * dy <= (n.r + 5) * (n.r + 5)) {
            return n;
          }
        }
        return null;
      }

      // Mouse Interactions
      canvas.addEventListener('mousedown', (e) => {
        const node = findNodeAt(e.clientX, e.clientY);
        if (node) {
          selectNode(node);
        } else {
          isDragging = true;
          dragStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          transform.x = e.clientX - dragStart.x;
          transform.y = e.clientY - dragStart.y;
          return;
        }

        const node = findNodeAt(e.clientX, e.clientY);
        if (node !== hoveredNode) {
          hoveredNode = node;
          if (hoveredNode) {
            tooltip.style.display = 'block';
            tooltip.style.left = e.clientX + 'px';
            tooltip.style.top = e.clientY + 'px';
            tooltip.innerHTML = \`<strong>\${hoveredNode.name}</strong> (\${hoveredNode.kind})<br><span style="color:#94A3B8;">\${hoveredNode.file}:\${hoveredNode.startLine}</span>\`;
          } else {
            tooltip.style.display = 'none';
          }
        } else if (hoveredNode) {
          tooltip.style.left = e.clientX + 'px';
          tooltip.style.top = e.clientY + 'px';
        }
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.08;
        const factor = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        transform.x = mouseX - (mouseX - transform.x) * factor;
        transform.y = mouseY - (mouseY - transform.y) * factor;
        transform.k = Math.max(0.2, Math.min(4, transform.k * factor));
      }, { passive: false });

      // Node Selection & Inspector Drawer
      function selectNode(n) {
        selectedNode = n;
        drawer.classList.add('open');

        document.getElementById('drawer-name').textContent = n.name;
        document.getElementById('drawer-kind').textContent = n.kind;
        document.getElementById('drawer-source').textContent = \`\${n.file}:\${n.startLine}-\${n.endLine}\`;
        document.getElementById('drawer-signature').textContent = n.signature || \`// Simbol \${n.kind} tanpa signature eksplisit\`;

        // Blast radius alert
        const callers = n.inbound.length;
        const riskBadge = document.getElementById('drawer-blast-risk');
        const descBox = document.getElementById('drawer-blast-desc');

        if (callers >= 3) {
          riskBadge.textContent = "CRITICAL / HIGH";
          riskBadge.style.color = "#F43F5E";
          descBox.textContent = \`⚠️ Titik Rawan: Dipanggil oleh \${callers} modul downstream. Modifikasi signature akan memicu ledakan refactor berantai.\`;
        } else if (callers >= 1) {
          riskBadge.textContent = "MEDIUM";
          riskBadge.style.color = "#F59E0B";
          descBox.textContent = \`Dipanggil oleh \${callers} komponen lain. Uji integrasi diperlukan jika mengubah tipe return.\`;
        } else {
          riskBadge.textContent = "LOW";
          riskBadge.style.color = "#10B981";
          descBox.textContent = "Simbol leaf / entry point; tidak memiliki modul internal lain yang bergantung langsung.";
        }

        // Populate Inbound
        const inboundList = document.getElementById('drawer-inbound-list');
        inboundList.innerHTML = '';
        if (n.inbound.length === 0) {
          inboundList.innerHTML = '<span style="font-size:0.7rem; color:#64748B;">Tidak ada pemanggil masuk.</span>';
        } else {
          n.inbound.forEach(link => {
            const item = document.createElement('div');
            item.className = 'link-item';
            const confPct = Math.round((link.edge.confidence || 0.9) * 100);
            item.innerHTML = \`
              <span class="link-item-name">\${link.source.name}</span>
              <span class="link-conf">\${confPct}%</span>
            \`;
            item.addEventListener('click', () => {
              panToNode(link.source);
              selectNode(link.source);
            });
            inboundList.appendChild(item);
          });
        }

        // Populate Outbound
        const outboundList = document.getElementById('drawer-outbound-list');
        outboundList.innerHTML = '';
        if (n.outbound.length === 0) {
          outboundList.innerHTML = '<span style="font-size:0.7rem; color:#64748B;">Tidak ada panggilan keluar.</span>';
        } else {
          n.outbound.forEach(link => {
            const item = document.createElement('div');
            item.className = 'link-item';
            const confPct = Math.round((link.edge.confidence || 0.9) * 100);
            item.innerHTML = \`
              <span class="link-item-name">\${link.target.name}</span>
              <span class="link-conf">\${confPct}%</span>
            \`;
            item.addEventListener('click', () => {
              panToNode(link.target);
              selectNode(link.target);
            });
            outboundList.appendChild(item);
          });
        }
      }

      function panToNode(n) {
        transform.x = width / 2 - n.x * transform.k;
        transform.y = height / 2 - n.y * transform.k;
      }

      drawerClose.addEventListener('click', () => {
        drawer.classList.remove('open');
        selectedNode = null;
      });

      // Controls Handlers
      btnReset.addEventListener('click', () => {
        transform = { x: width / 2, y: height / 2, k: 1 };
      });

      btnPause.addEventListener('click', () => {
        physicsRunning = !physicsRunning;
        btnPause.textContent = physicsRunning ? "⏸ Pause" : "▶ Resume";
      });

      btnRoast.addEventListener('click', () => {
        roastMode = !roastMode;
        btnRoast.classList.toggle('active', roastMode);
      });

      const fuzzyDropdown = document.getElementById('fuzzy-dropdown');

      function damerauLevenshtein(s1, s2) {
        const len1 = s1.length;
        const len2 = s2.length;
        if (len1 === 0) return len2;
        if (len2 === 0) return len1;
        const d = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));
        for (let i = 0; i <= len1; i++) d[i][0] = i;
        for (let j = 0; j <= len2; j++) d[0][j] = j;

        for (let i = 1; i <= len1; i++) {
          for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
              d[i - 1][j] + 1,
              d[i][j - 1] + 1,
              d[i - 1][j - 1] + cost
            );
            if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
              d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
          }
        }
        return d[len1][len2];
      }

      function splitIdentifier(name) {
        return name
          .replace(/([a-z\d])([A-Z])/g, "$1 $2")
          .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1 $2")
          .split(/[\s_\-.:]+/)
          .filter(Boolean)
          .map(t => t.toLowerCase());
      }

      function acronymMatch(query, target) {
        const qParts = splitIdentifier(query);
        const tParts = splitIdentifier(target);
        if (qParts.length === 0 || tParts.length === 0) return false;
        let tIdx = 0;
        for (let qIdx = 0; qIdx < qParts.length; qIdx++) {
          const q = qParts[qIdx];
          let matched = false;
          while (tIdx < tParts.length) {
            const t = tParts[tIdx++];
            if (t.startsWith(q) || (q.length === 1 && t[0] === q)) {
              matched = true;
              break;
            }
          }
          if (!matched) return false;
        }
        return true;
      }

      function evaluateFuzzyScore(query, target) {
        const qLow = query.toLowerCase();
        const tLow = target.toLowerCase();
        if (qLow === tLow) return { score: 1.0, isAcronym: false };
        if (tLow.includes(qLow)) {
          const prefixBonus = tLow.startsWith(qLow) ? 0.2 : 0.1;
          const ratio = Math.min(0.7, qLow.length / tLow.length);
          return { score: Math.min(0.99, ratio + prefixBonus), isAcronym: false };
        }
        if (acronymMatch(query, target)) {
          return { score: 0.92, isAcronym: true };
        }
        const dist = damerauLevenshtein(qLow, tLow);
        const maxLen = Math.max(qLow.length, tLow.length);
        const sim = Math.max(0, 1.0 - dist / maxLen);
        return { score: Math.round(sim * 100) / 100, isAcronym: false };
      }

      function renderFuzzyResults(matches) {
        if (!fuzzyDropdown) return;
        if (matches.length === 0) {
          fuzzyDropdown.classList.remove('active');
          fuzzyDropdown.innerHTML = '';
          return;
        }

        fuzzyDropdown.innerHTML = matches.map(m => 
          '<div class="fuzzy-item" data-node-id="' + m.node.id + '">' +
            '<div class="fuzzy-item-left">' +
              '<span class="fuzzy-item-name">' + m.node.name + '</span>' +
              '<span class="fuzzy-item-meta">' + m.node.kind + ' • ' + m.node.file + '</span>' +
            '</div>' +
            '<span class="fuzzy-badge ' + (m.isAcronym ? 'acronym' : '') + '">' +
              (m.isAcronym ? '⚡ Acronym' : Math.round(m.score * 100) + '% Match') +
            '</span>' +
          '</div>'
        ).join('');

        fuzzyDropdown.classList.add('active');

        fuzzyDropdown.querySelectorAll('.fuzzy-item').forEach(item => {
          item.addEventListener('click', () => {
            const nodeId = item.getAttribute('data-node-id');
            const targetNode = nodes.find(n => n.id === nodeId);
            if (targetNode) {
              panToNode(targetNode);
              selectedNode = targetNode;
              updateInspectorDrawer(targetNode);
              drawer.classList.add('active');
              fuzzyDropdown.classList.remove('active');
            }
          });
        });
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
          fuzzyDropdown?.classList.remove('active');
        }
      });

      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        if (searchQuery.length < 2) {
          fuzzyDropdown?.classList.remove('active');
          return;
        }

        const candidates = [];
        for (const n of nodes) {
          const res = evaluateFuzzyScore(searchQuery, n.name);
          if (res.score >= 0.45) {
            candidates.push({ node: n, score: res.score, isAcronym: res.isAcronym });
          }
        }

        candidates.sort((a, b) => b.score - a.score);
        const topMatches = candidates.slice(0, 5);
        renderFuzzyResults(topMatches);

        if (topMatches.length > 0 && searchQuery.length >= 3) {
          panToNode(topMatches[0].node);
        }
      });
    })();
  </script>
</body>
</html>`;
}
