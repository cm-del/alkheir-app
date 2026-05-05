'use strict';
const Weather = {
    cache: {},
    currentRegion: '30.06,31.25',
    async load(region = this.currentRegion) {
        const key = region;
        const cached = this.cache[key];
        if (cached && Date.now() - cached.ts < 1800000) return cached.data;
        const [lat, lon] = region.split(',');
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=Africa/Cairo`);
            const d = await res.json();
            const data = {
                temp: d.current.temperature_2m,
                hum: d.current.relative_humidity_2m,
                fl: d.current.apparent_temperature,
                wind: d.current.wind_speed_10m
            };
            this.cache[key] = { ts: Date.now(), data };
            return data;
        } catch(e) {
            return null;
        }
    },
    async getAlerts() {
        const w = await this.load();
        if (!w) return [];

        const activeBatches = await db.batches.where('active').equals(1).toArray();
        if (!activeBatches.length) return [];

        const avgAge = Math.round(activeBatches.reduce((s, b) => s + Utils.dAge(b.date), 0) / activeBatches.length);
        const rec = Utils.idealRec(avgAge);

        const alerts = [];
        if (w.temp > rec.mx) {
            alerts.push(`⚠️ إجهاد حراري: الحرارة ${w.temp}°C أعلى من المثالي (${rec.mn}–${rec.mx}°C)`);
        } else if (w.temp < rec.mn) {
            alerts.push(`❄️ انخفاض حرارة: الحرارة ${w.temp}°C أقل من المثالي (${rec.mn}–${rec.mx}°C)`);
        }

        if (w.hum > rec.hx) {
            alerts.push(`💧 رطوبة مرتفعة: ${w.hum}% (المثالي ${rec.hn}–${rec.hx}%)`);
        } else if (w.hum < rec.hn) {
            alerts.push(`🏜️ رطوبة منخفضة: ${w.hum}% (المثالي ${rec.hn}–${rec.hx}%)`);
        }

        return alerts;
    },
    async renderWidget(elId) {
        const w = await this.load();
        if (!w) return null;
        document.getElementById(elId || 'hdrTemp').textContent = w.temp + '°';
        const ab = await db.batches.where('active').equals(1).toArray();
        const avg = ab.length ? Math.round(ab.reduce((s,b) => s + Utils.dAge(b.date),0) / ab.length) : 21;
        const rec = Utils.idealRec(avg);
        const tOk = w.temp >= rec.mn && w.temp <= rec.mx;
        const hOk = w.hum >= rec.hn && w.hum <= rec.hx;
        return { w, rec, tOk, hOk, avg };
    }
};
