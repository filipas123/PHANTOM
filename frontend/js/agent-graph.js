/**
 * Simple Canvas-based visualization of the Multi-Agent System.
 * Draws nodes (agents) and animated edges (message flow).
 */
export class AgentGraph {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.nodes = [];
    this.edges = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = 300; // Fixed height for dashboard
    this.initGraph();
  }

  initGraph() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.min(cx, cy) - 40;

    // Orchestrator at center
    this.nodes = [
      { id: 'orchestrator', label: 'Orchestrator', x: cx, y: cy, color: '#6366f1' }
    ];

    // Specialists in orbit
    const specialists = ['Planner', 'Executor', 'Threat Modeler', 'Log Analyzer', 'Compliance', 'Reporter'];
    const angleStep = (Math.PI * 2) / specialists.length;

    specialists.forEach((name, i) => {
      const angle = i * angleStep;
      this.nodes.push({
        id: name.toLowerCase().replace(' ', '-'),
        label: name,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        color: '#22c55e'
      });
      // Edge from orchestrator to specialist
      this.edges.push({ source: 'orchestrator', target: name.toLowerCase().replace(' ', '-'), particles: [] });
    });
  }

  /**
   * Triggers an animated particle from one node to another.
   */
  sendMessage(sourceId, targetId) {
    const edge = this.edges.find(e =>
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId)
    );
    if (edge) {
      edge.particles.push({
        progress: 0,
        direction: edge.source === sourceId ? 1 : -1
      });
    }
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Edges
    this.ctx.lineWidth = 2;
    this.edges.forEach(edge => {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);

      if (!source || !target) return;

      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(target.x, target.y);
      this.ctx.strokeStyle = '#374151'; // Dark gray
      this.ctx.stroke();

      // Draw animated particles
      edge.particles.forEach((p, i) => {
        p.progress += 0.02;
        if (p.progress >= 1) {
          edge.particles.splice(i, 1);
          return;
        }

        const t = p.direction === 1 ? p.progress : 1 - p.progress;
        const px = source.x + (target.x - source.x) * t;
        const py = source.y + (target.y - source.y) * t;

        this.ctx.beginPath();
        this.ctx.arc(px, py, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#eab308'; // Yellow message
        this.ctx.fill();
      });
    });

    // Draw Nodes
    this.nodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);
      this.ctx.fillStyle = '#1f2937';
      this.ctx.fill();
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = node.color;
      this.ctx.stroke();

      this.ctx.fillStyle = '#e5e7eb';
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.label, node.x, node.y + 40);
    });

    requestAnimationFrame(this.animate);
  }
}
