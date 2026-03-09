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
 * --- CSV Export Logic ---
 */
const exportToCSV = () => {
    const inTime = document.getElementById('in-time').value;
    const outTime = document.getElementById('out-time').value;
    const netTotal = document.getElementById('net-duration').textContent;
    const breakRows = document.querySelectorAll('.break-row');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Start Time,End Time,Duration\r\n";
    
    const grossTotal = document.getElementById('work-duration').textContent;
    csvContent += `Work Shift,${inTime},${outTime},${grossTotal.replace('Gross Duration: ', '')}\r\n`;

    breakRows.forEach((row, index) => {
        const s = row.querySelector('.break-start').value;
        const e = row.querySelector('.break-end').value;
        const d = row.querySelector('.break-duration-display').textContent;
        if (s || e) csvContent += `Break ${index + 1},${s},${e},${d}\r\n`;
    });

    csvContent += `\r\nNET TOTAL,,,${netTotal.replace('Net: ', '')}\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Work_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * --- Persistence & Core Engine ---
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

const calculateAll = () => {
    const inTimeStr = document.getElementById('in-time').value;
    const outTimeStr = document.getElementById('out-time').value;
    const breakRows = document.querySelectorAll('.break-row');
    const resetBtn = document.getElementById('reset-btn');
    const exportBtn = document.getElementById('export-btn');
    
    // Optimized Reset/Export check
    let anyData = !!(inTimeStr || outTimeStr);
    if (!anyData) {
        for (let row of breakRows) {
            if (row.querySelector('.break-start').value || row.querySelector('.break-end').value) {
                anyData = true; break;
            }
        }
    }
    resetBtn.disabled = !anyData;
    exportBtn.disabled = !anyData;

    const inMin = timeToMinutes(inTimeStr);
    const outMin = timeToMinutes(outTimeStr);
    
    if (!inTimeStr || !outTimeStr) {
        document.getElementById('work-duration').textContent = 'Gross Duration: 0m';
        document.getElementById('net-duration-section').classList.add('hidden');
        saveInputs(); return;
    }

    const gross = outMin - inMin;
    if (gross <= 0) {
        document.getElementById('net-duration').textContent = 'Invalid Interval';
        document.getElementById('net-duration-section').classList.remove('hidden');
        saveInputs(); return;
    }

    document.getElementById('work-duration').textContent = `Gross Duration: ${formatMinutes(gross)}`;

    let totalBreak = 0, valid = true;
    breakRows.forEach((row) => {
        const s = row.querySelector('.break-start').value, e = row.querySelector('.break-end').value;
        const disp = row.querySelector('.break-duration-display');
        row.classList.remove('bg-red-50');
        if (!s || !e) return;
        const bS = timeToMinutes(s), bE = timeToMinutes(e), bD = bE - bS;
        if (bD <= 0 || bS < inMin || bE > outMin) {
            row.classList.add('bg-red-50'); valid = false; disp.textContent = 'Err';
        } else {
            disp.textContent = formatMinutes(bD); totalBreak += bD;
        }
    });

    document.getElementById('net-duration-section').classList.remove('hidden');
    if (!valid) {
        document.getElementById('net-duration').textContent = 'Check Errors';
    } else {
        const net = gross - totalBreak;
        document.getElementById('net-duration').textContent = `Net: ${formatMinutes(net)}`;
        document.getElementById('total-break-duration').textContent = `Total Break: ${formatMinutes(totalBreak)}`;
    }
    saveInputs();
};

/**
 * --- UI Row Management ---
 */
const addBreakRow = (defS = '', defE = '') => {
    const container = document.getElementById('breaks-container');
    const row = document.createElement('div');
    row.className = 'break-row flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden';
    row.innerHTML = `
        <input type="time" class="break-start p-2 text-xs border border-gray-200 rounded-lg outline-none w-[45%] sm:w-[100px]" value="${defS}">
        <span class="text-gray-300 text-[8px] font-black flex-grow sm:flex-grow-0 text-center">to</span>
        <input type="time" class="break-end p-2 text-xs border border-gray-200 rounded-lg outline-none w-[45%] sm:w-[100px]" value="${defE}">
        <span class="break-duration-display text-[9px] font-black text-blue-500 flex-grow text-right">-</span>
        <button type="button" class="delete-btn text-gray-300 hover:text-red-500 p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-4 h-4"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>`;
    container.appendChild(row);
    row.querySelectorAll('input').forEach(i => i.addEventListener('change', calculateAll));
    row.querySelector('.delete-btn').addEventListener('click', () => { row.remove(); calculateAll(); });
};

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        document.getElementById('in-time').value = data.inTime || '';
        document.getElementById('out-time').value = data.outTime || '';
        data.breaks?.forEach(b => addBreakRow(b.start, b.end));
    } else { addBreakRow(); }
    calculateAll();
    document.getElementById('in-time').addEventListener('change', calculateAll);
    document.getElementById('out-time').addEventListener('change', calculateAll);
    document.getElementById('add-break-btn').addEventListener('click', () => addBreakRow());
    document.getElementById('reset-btn').addEventListener('click', () => confirm("Reset?") && (localStorage.removeItem(STORAGE_KEY), location.reload()));
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
});
