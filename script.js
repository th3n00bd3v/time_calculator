/**
 * --- Logic & Formatting ---
 */
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

const formatMinutes = (totalMinutes) => {
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
};

/**
 * --- Local Storage & Reset ---
 */
const STORAGE_KEY = 'timeSheetData_v2';

const saveInputs = () => {
    const inTime = document.getElementById('in-time').value;
    const outTime = document.getElementById('out-time').value;
    const breakRows = document.querySelectorAll('.break-row');
    const breaks = Array.from(breakRows).map(row => ({
        start: row.querySelector('.break-start').value,
        end: row.querySelector('.break-end').value,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ inTime, outTime, breaks }));
};

const loadInputs = () => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const data = JSON.parse(savedData);
        document.getElementById('in-time').value = data.inTime || '';
        document.getElementById('out-time').value = data.outTime || '';
        document.getElementById('breaks-container').innerHTML = '';
        if (data.breaks && data.breaks.length > 0) {
            data.breaks.forEach(b => addBreakRow(b.start, b.end));
        } else { addBreakRow(); }
    } else { addBreakRow(); }
    calculateAll();
};

const resetAll = () => {
    if (confirm("Clear all entries?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
};

/**
 * --- Main Calculation Engine ---
 */
const calculateAll = () => {
    const inTimeStr = document.getElementById('in-time').value;
    const outTimeStr = document.getElementById('out-time').value;
    const breakRows = document.querySelectorAll('.break-row');
    const validationMsg = document.getElementById('validation-message');
    const resetBtn = document.getElementById('reset-btn');
    
    // --- Logic to Disable Reset Button ---
    let anyDataEntered = !!(inTimeStr || outTimeStr);
    breakRows.forEach(row => {
        if (row.querySelector('.break-start').value || row.querySelector('.break-end').value) {
            anyDataEntered = true;
        }
    });
    resetBtn.disabled = !anyDataEntered;

    const inMin = timeToMinutes(inTimeStr);
    const outMin = timeToMinutes(outTimeStr);
    
    if (!inTimeStr || !outTimeStr) {
        document.getElementById('work-duration').textContent = 'Gross Duration: 0m';
        document.getElementById('net-duration-section').classList.add('hidden');
        saveInputs();
        return;
    }

    const gross = outMin - inMin;
    if (gross <= 0) {
        validationMsg.textContent = '⛔ Out Time must be later than In Time.';
        document.getElementById('net-duration-section').classList.remove('hidden');
        document.getElementById('net-duration').textContent = 'Invalid';
        saveInputs();
        return;
    }

    document.getElementById('work-duration').textContent = `Gross Duration: ${formatMinutes(gross)}`;

    let hasBreak = false, totalBreak = 0, intervals = [], valid = true;

    breakRows.forEach((row) => {
        const s = row.querySelector('.break-start').value;
        const e = row.querySelector('.break-end').value;
        const display = row.querySelector('.break-duration-display');
        
        row.classList.remove('bg-red-50', 'border-red-200');
        display.textContent = '-'; 

        if (!s && !e) return;
        hasBreak = true;
        if (!s || !e) { valid = false; return; }

        const bS = timeToMinutes(s), bE = timeToMinutes(e), bD = bE - bS;

        if (bD <= 0 || bS < inMin || bE > outMin) {
            row.classList.add('bg-red-50', 'border-red-200');
            valid = false; display.textContent = 'Err';
        } else {
            display.textContent = formatMinutes(bD);
        }

        for (const i of intervals) {
            if (bS < i.end && i.start < bE) {
                row.classList.add('bg-red-50', 'border-red-200');
                display.textContent = 'Overlap';
                valid = false; break;
            }
        }

        if (valid) { totalBreak += bD; intervals.push({ start: bS, end: bE }); }
    });

    document.getElementById('net-duration-section').classList.toggle('hidden', !hasBreak);
    validationMsg.textContent = valid ? '' : 'Check break entries for errors';

    if (!valid) {
        document.getElementById('total-break-duration').textContent = 'Total Break: Invalid';
        document.getElementById('net-duration').textContent = 'Error';
    } else {
        document.getElementById('total-break-duration').textContent = `Total Break: ${formatMinutes(totalBreak)}`;
        const net = gross - totalBreak;
        document.getElementById('net-duration').textContent = net < 0 ? 'Negative' : `Net: ${formatMinutes(net)}`;
    }
    saveInputs(); 
};

/**
 * --- UI Row Management ---
 */
const updateDeleteButtons = () => {
    const rows = document.querySelectorAll('.break-row');
    rows.forEach(row => {
        const btn = row.querySelector('.delete-btn');
        rows.length <= 1 ? btn.classList.add('hidden') : btn.classList.remove('hidden');
    });
};

const addBreakRow = (defS = '', defE = '') => {
    const container = document.getElementById('breaks-container');
    const row = document.createElement('div');
    row.className = 'break-row flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden';
    
    row.innerHTML = `
        <input type="time" class="break-start p-2 text-xs border border-gray-200 rounded-lg outline-none w-[45%] sm:w-[100px] flex-shrink-0" value="${defS}">
        <span class="text-gray-300 text-[8px] font-black flex-grow sm:flex-grow-0 text-center uppercase tracking-tighter">to</span>
        <input type="time" class="break-end p-2 text-xs border border-gray-200 rounded-lg outline-none w-[45%] sm:w-[100px] flex-shrink-0" value="${defE}">
        <span class="break-duration-display text-[9px] font-black text-blue-500 flex-grow text-right italic min-w-[40px] px-1">-</span>
        <button type="button" class="delete-btn text-gray-300 hover:text-red-500 p-1 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
    `;
    
    container.appendChild(row);
    row.querySelectorAll('input').forEach(i => i.addEventListener('change', calculateAll));
    row.querySelector('.delete-btn').addEventListener('click', () => {
        row.remove(); updateDeleteButtons(); calculateAll();
    });
    updateDeleteButtons();
};

document.addEventListener('DOMContentLoaded', () => {
    loadInputs(); 
    document.getElementById('in-time').addEventListener('change', calculateAll);
    document.getElementById('out-time').addEventListener('change', calculateAll);
    document.getElementById('add-break-btn').addEventListener('click', () => addBreakRow());
    document.getElementById('reset-btn').addEventListener('click', resetAll);
});