/**
 * APP CONTROLLER 
 * Manages DOM interactions, validation, and state
 */
const App = {
    key: 'workpulse_pro_session_light',
    MAX_BREAKS: 20,
    init() { this.cacheDOM(); this.bindEvents(); this.load(); this.startClock(); },
    cacheDOM() {
        this.dom = {
            in: document.getElementById('in-time'),
            out: document.getElementById('out-time'),
            container: document.getElementById('breaks-container'),
            gross: document.getElementById('gross-output'),
            net: document.getElementById('net-output'),
            netCard: document.getElementById('net-card-container'),
            err: document.getElementById('error-output'),
            reset: document.getElementById('reset-btn'),
            export: document.getElementById('export-btn'),
            addBtn: document.getElementById('add-break-btn'),
            totalB: document.getElementById('total-break-display'),
            dateDisplay: document.getElementById('current-date')
        };
    },
    bindEvents() {
        this.dom.in.onchange = this.dom.out.onchange = () => this.update();
        this.dom.addBtn.onclick = () => this.addRow();
        this.dom.reset.onclick = () => this.reset();
        this.dom.export.onclick = () => this.handleExport();
    },
    addRow(s = '', e = '') {
        const rowCount = document.querySelectorAll('.break-row').length;
        if (rowCount >= this.MAX_BREAKS) return;
        const row = document.createElement('div');
        // Grid template: 3 even columns + 1 action column
        row.className = 'break-row bg-white/70 border border-blue-50 rounded-2xl p-3 grid grid-cols-[1fr_1fr_1fr_40px] items-center gap-4 animate-up';
        row.innerHTML = `
            <input type="time" class="b-start bg-transparent font-bold text-sm outline-none text-center" value="${s}">
            <input type="time" class="b-end bg-transparent font-bold text-sm outline-none text-center" value="${e}">
            <span class="b-dur text-center text-[10px] font-black text-[#00A3FF] uppercase tracking-tighter">-</span>
            <button class="del-btn p-2 text-slate-300 hover:text-red-400 transition-colors justify-self-center">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="3"/></svg>
            </button>`;
        row.querySelectorAll('input').forEach(i => i.onchange = () => this.update());
        row.querySelector('.del-btn').onclick = () => {
            if (document.querySelectorAll('.break-row').length > 1) { row.remove(); this.update(); }
        };
        this.dom.container.appendChild(row);
        this.update();
    },
    update() {
        const rows = [...document.querySelectorAll('.break-row')];
        const sMin = TimeLogic.toMin(this.dom.in.value);
        const eMin = TimeLogic.toMin(this.dom.out.value);
        const gross = eMin - sMin;
        const shiftInverted = (this.dom.in.value && this.dom.out.value && gross <= 0);

        this.dom.gross.classList.toggle('text-red-400', shiftInverted);
        this.dom.gross.textContent = shiftInverted ? "Invalid" : (gross > 0 ? TimeLogic.fmt(gross) : "0h 0m");

        rows.forEach(r => r.querySelector('.del-btn').style.visibility = (rows.length === 1) ? 'hidden' : 'visible');

        let totalB = 0, overlap = false, outOfBounds = false, duplicate = false, intervals = [];
        const breakData = rows.map(r => {
            const s = r.querySelector('.b-start').value, e = r.querySelector('.b-end').value;
            const start = TimeLogic.toMin(s), end = TimeLogic.toMin(e);
            let durStr = '-', rowError = false;
            if (start && end) {
                const dur = end - start;
                if (dur <= 0) { durStr = "ERR"; rowError = true; }
                else {
                    durStr = TimeLogic.fmt(dur);
                    totalB += dur;
                    if (intervals.some(i => start === i.s && end === i.e)) duplicate = true;
                    if (intervals.some(i => start < i.e && i.s < end)) overlap = true;
                    if (start < sMin || end > eMin) outOfBounds = true;
                    intervals.push({ s: start, e: end });
                }
            }
            const durEl = r.querySelector('.b-dur');
            durEl.textContent = durStr;
            durEl.classList.toggle('text-red-400', rowError);
            return { s, e, dur: durStr, err: rowError };
        });

        this.dom.totalB.textContent = TimeLogic.fmt(totalB);
        const hasShift = (this.dom.in.value && this.dom.out.value);
        const globalErr = shiftInverted || overlap || outOfBounds || duplicate || breakData.some(b => b.err);

        // Precision Error Messages
        if (shiftInverted) this.dom.err.textContent = "Check shift times";
        else if (breakData.some(b => b.err)) this.dom.err.textContent = "Check break times";
        else if (outOfBounds) this.dom.err.textContent = "Break outside shift";
        else if (overlap) this.dom.err.textContent = "Overlapping breaks";
        else if (duplicate) this.dom.err.textContent = "Duplicate breaks";
        else this.dom.err.textContent = "";

        // UI State Logic
        if (!globalErr && hasShift && gross > 0) {
            this.dom.netCard.classList.remove('opacity-20', 'grayscale');
            this.dom.net.textContent = TimeLogic.fmt(gross - totalB);
        } else {
            this.dom.netCard.classList.add('opacity-20', 'grayscale');
            this.dom.net.textContent = "--";
        }

        const canExport = !!(hasShift && !globalErr);
        this.dom.export.disabled = !canExport;
        this.dom.export.className = canExport ? "p-2 bg-[#00A3FF] text-white rounded-full shadow-lg transition-all" : "p-2 bg-slate-100 text-slate-300 rounded-full cursor-not-allowed transition-all";
        
        this.dom.reset.disabled = !(this.dom.in.value || this.dom.out.value || rows.length > 1);
        localStorage.setItem(this.key, JSON.stringify({ in: this.dom.in.value, out: this.dom.out.value, breaks: breakData }));
    },
    handleExport() {
        if (this.dom.export.disabled) return;
        const rows = [...document.querySelectorAll('.break-row')];
        const breaks = rows.map(r => ({ s: r.querySelector('.b-start').value, e: r.querySelector('.b-end').value, dur: r.querySelector('.b-dur').textContent })).filter(b => b.s && b.e);
        const csv = TimeLogic.generateCSV({ in: this.dom.in.value, out: this.dom.out.value }, breaks, this.dom.gross.textContent, this.dom.net.textContent);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `WorkPulse_Export.csv`;
        a.click();
    },
    startClock() {
        setInterval(() => {
            const now = new Date();
            this.dom.dateDisplay.innerHTML = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} <span class="text-[#00A3FF] ml-1 font-black">${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>`;
        }, 1000);
    },
    load() {
        const data = JSON.parse(localStorage.getItem(this.key));
        this.dom.container.innerHTML = '';
        if (data) {
            this.dom.in.value = data.in || ''; this.dom.out.value = data.out || '';
            if (data.breaks?.length) data.breaks.forEach(b => this.addRow(b.s, b.e)); else this.addRow();
        } else this.addRow();
    },
    reset() { if (confirm("Clear data?")) { localStorage.removeItem(this.key); location.reload(); } }
};
document.addEventListener('DOMContentLoaded', () => App.init());
