const TimeLogic = {
    toMin: (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    },
    fmt: (min) => {
        if (min < 0 || isNaN(min)) return "0m";
        const h = Math.floor(min / 60), m = min % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },
    getTimestamp: () => {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
    },
    generateCSV: (shift, breaks, grossStr, netStr) => {
        let csv = `Category,In,Out,Duration\n`;
        csv += `Shift,${shift.in || '-'},${shift.out || '-'},${grossStr}\n`;
        breaks.forEach((b, i) => {
            if (b.s && b.e) csv += `Break ${i+1},${b.s},${b.e},${b.dur}\n`;
        });
        csv += `\n,,NET TOTAL,${netStr}`;
        return csv;
    }
};
