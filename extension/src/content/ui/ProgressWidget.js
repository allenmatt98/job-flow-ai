/**
 * ProgressWidget - A floating UI component to show auto-fill status.
 * Features:
 * - Shows progress (e.g., "Filling... 3/15")
 * - Pause / Resume controls
 * - Stop button
 * - Draggable (optional, kept simple fixed position for now)
 */

export class ProgressWidget {
    constructor() {
        this.container = null;
        this.shadowParams = { mode: 'closed' }; // Closed shadow DOM to prevent page CSS leaks
        this.state = {
            total: 0,
            filled: 0,
            isPaused: false,
            statusText: 'Ready'
        };

        // Bind methods
        this.togglePause = this.togglePause.bind(this);
        this.stop = this.stop.bind(this);
    }

    mount() {
        if (this.container) return; // Already mounted

        // Create host
        this.host = document.createElement('div');
        this.host.id = 'job-flow-ai-widget-host';
        Object.assign(this.host.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '2147483647', // Max z-index
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        });

        // Create Shadow Root
        this.shadow = this.host.attachShadow({ mode: 'open' });

        // Add Styles
        const style = document.createElement('style');
        style.textContent = `
            .widget {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 16px;
                width: 280px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                animation: slideIn 0.3s ease-out;
                border: 1px solid #e5e7eb;
            }
            
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 600;
                color: #111827;
                font-size: 14px;
            }

            .status-badge {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 10px;
                background: #f3f4f6;
                color: #4b5563;
            }

            .progress-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .progress-bar {
                flex: 1;
                height: 6px;
                background: #f3f4f6;
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #2563eb);
                width: 0%;
                transition: width 0.3s ease;
            }

            .progress-text {
                font-size: 12px;
                color: #6b7280;
                min-width: 40px;
                text-align: right;
            }

            .controls {
                display: flex;
                gap: 8px;
            }

            button {
                flex: 1;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }

            .btn-pause {
                background: #eff6ff;
                color: #1d4ed8;
            }
            .btn-pause:hover { background: #dbeafe; }

            .btn-resume {
                background: #ecfdf5;
                color: #047857;
                display: none;
            }
            .btn-resume:hover { background: #d1fae5; }

            .btn-stop {
                background: #fef2f2;
                color: #b91c1c;
            }
            .btn-stop:hover { background: #fee2e2; }

            /* Pause State */
            .widget.paused .progress-fill { background: #9ca3af; }
            .widget.paused .btn-pause { display: none; }
            .widget.paused .btn-resume { display: block; }
        `;
        this.shadow.appendChild(style);

        // Create Container
        this.container = document.createElement('div');
        this.container.className = 'widget';
        this.container.innerHTML = `
            <div class="header">
                <span>Job Flow AI</span>
                <span class="status-badge" id="status">Ready</span>
            </div>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="fill"></div>
                </div>
                <span class="progress-text" id="count">0/0</span>
            </div>

            <div class="controls">
                <button class="btn-pause" id="btn-pause">⏸ Pause</button>
                <button class="btn-resume" id="btn-resume">▶ Resume</button>
                <button class="btn-stop" id="btn-stop">⏹ Stop</button>
            </div>
        `;
        this.shadow.appendChild(this.container);

        // Bind Events
        this.shadow.getElementById('btn-pause').onclick = () => this.togglePause(true);
        this.shadow.getElementById('btn-resume').onclick = () => this.togglePause(false);
        this.shadow.getElementById('btn-stop').onclick = this.stop;

        document.body.appendChild(this.host);
    }

    update(filled, total, statusText) {
        if (!this.container) this.mount();

        this.state.filled = filled;
        this.state.total = Math.max(total, filled); // Ensure total >= filled
        if (statusText) this.state.statusText = statusText;

        const percent = Math.round((this.state.filled / this.state.total) * 100) || 0;

        const fillEl = this.shadow.getElementById('fill');
        const countEl = this.shadow.getElementById('count');
        const statusEl = this.shadow.getElementById('status');

        if (fillEl) fillEl.style.width = `${percent}%`;
        if (countEl) countEl.innerText = `${this.state.filled}/${this.state.total}`;
        if (statusEl) statusEl.innerText = this.state.statusText;
    }

    togglePause(shouldPause) {
        this.state.isPaused = shouldPause;
        if (this.container) {
            if (shouldPause) {
                this.container.classList.add('paused');
                this.update(this.state.filled, this.state.total, 'Paused');
            } else {
                this.container.classList.remove('paused');
                this.update(this.state.filled, this.state.total, 'Resumed');
            }
        }

        // Dispatch event for Strategy to listen to
        window.dispatchEvent(new CustomEvent('JOB_FLOW_PAUSE_TOGGLE', {
            detail: { paused: shouldPause }
        }));
    }

    stop() {
        if (this.host) {
            this.host.remove();
            this.host = null;
            this.container = null;
        }
        window.dispatchEvent(new CustomEvent('JOB_FLOW_STOP'));
    }

    destroy() {
        if (this.host) {
            this.host.remove();
        }
    }
}

export const progressWidget = new ProgressWidget();
