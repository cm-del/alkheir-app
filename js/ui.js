'use strict';
const UI = {
    async getFeedStock(farmId) {
        const records = await db.feedStore.where('farmId').equals(farmId).toArray();
        const i = records.filter(r => r.txType === 'in').reduce((s, r) => s + r.kg, 0);
        const o = records.filter(r => r.txType === 'out').reduce((s, r) => s + r.kg, 0);
        const kg = Math.max(0, i - o);
        return { kg, bags: kg / KPB };
    },

    async fillBatchSelect(selectId, includeEmpty = false) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        sel.innerHTML = includeEmpty ? '<option value="">عام</option>' : '<option value="">اختر دفعة...</option>';
        let batches;
        if (App.currentHangar) {
            batches = await db.batches.where('hangarId').equals(App.currentHangar).toArray();
        } else if (App.currentFarm) {
            const hs = await db.hangars.where('farmId').equals(App.currentFarm).toArray();
            const hids = hs.map(h => h.id);
            batches = await db.batches.where('hangarId').anyOf(hids).toArray();
        } else {
            batches = await db.batches.toArray();
        }
        batches.forEach(b => {
            sel.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    },

    async fillHangarSelect(selectId) {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        sel.innerHTML = '<option value="">اختر عنبر...</option>';
        const hangars = App.currentFarm
            ? await db.hangars.where('farmId').equals(App.currentFarm).toArray()
            : await db.hangars.toArray();
        hangars.forEach(h => {
            sel.innerHTML += `<option value="${h.id}">${h.name}</option>`;
        });
    },

    async updateFeedStockInfo() {
        const bid = document.getElementById('fd-b')?.value;
        if (!bid) return;
        const batch = await db.batches.get(bid);
        if (!batch) return;
        const hangar = await db.hangars.get(batch.hangarId);
        if (!hangar) return;
        const stock = await this.getFeedStock(hangar.farmId);
        const info = document.getElementById('fd-stock-info');
        if (info) {
            info.innerHTML = `<span style="color:${stock.bags < 10 ? 'var(--danger)' : 'var(--a)'}">🌾 المخزن: ${stock.bags.toFixed(1)} شيكارة</span>`;
        }
    },

    async showDeathTodayInfo() {
        const bid = document.getElementById('dt-b')?.value;
        const d = Utils.todayS();
        const el = document.getElementById('dt-today');
        if (!el) return;
        if (!bid) { el.textContent = ''; return; }
        const tds = await db.deaths.where({ batchId: bid, date: d }).toArray();
        if (!tds.length) { el.textContent = ''; return; }
        const sum = tds.reduce((s, x) => s + x.count, 0);
        el.innerHTML = `<span style="color:var(--danger)">نفوق اليوم: <b>${sum}</b></span>`;
    },

    calcSaleTotal() {
        const cnt = +document.getElementById('sl-cnt')?.value || 0;
        const w = +document.getElementById('sl-w')?.value || 0;
        const price = +document.getElementById('sl-price')?.value || 0;
        const total = document.getElementById('sl-total');
        if (total) total.value = Math.round(cnt * w * price);
    },

    async showIdealTempInfo() {
        const hid = document.getElementById('tl-h')?.value;
        const el = document.getElementById('tl-ideal');
        if (!el) return;
        if (!hid) { el.textContent = ''; return; }
        const bts = await db.batches.where({ hangarId: hid, active: true }).toArray();
        if (!bts.length) { el.textContent = ''; return; }
        const avg = Math.round(bts.reduce((s, b) => s + Utils.dAge(b.date), 0) / bts.length);
        const rec = Utils.idealRec(avg);
        el.innerHTML = `<span style="color:var(--a)">المثالي لعمر ${avg} يوم: ${rec.mn}–${rec.mx}°</span>`;
    },

    previewPhoto(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.getElementById('ph-img');
                const preview = document.getElementById('ph-preview');
                if (img && preview) {
                    img.src = e.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    async checkLock() {
        const lockSetting = await db.settings.get('lock');
        if (!lockSetting) return true;
        return new Promise(resolve => {
            const div = document.createElement('div');
            div.className = 'lock-screen';
            div.innerHTML = `<h3>🔒 التطبيق مقفل</h3><input type="password" id="lock-input" placeholder="الرقم السري"><button class="btn btn-g" id="lock-submit">فتح</button>`;
            document.body.appendChild(div);
            document.getElementById('lock-submit').onclick = () => {
                if (document.getElementById('lock-input').value === lockSetting.value) {
                    div.remove();
                    resolve(true);
                } else {
                    Utils.toast('رقم سري خاطئ', 'error');
                }
            };
        });
    },
    async toggleLock() {
        const lockSetting = await db.settings.get('lock');
        if (lockSetting) {
            if (await Utils.confirm('إلغاء القفل؟')) {
                await db.settings.delete('lock');
                Utils.toast('تم إلغاء القفل');
            }
        } else {
            Modals.open('lock');
        }
    },

    async renderFarmBar() {
        const bar = document.getElementById('farmBar');
        if (!bar) return;
        let html = `<button class="fp-add" onclick="Modals.open('addFarm')">+ مزرعة</button>`;
        const farms = await db.farms.toArray();
        farms.forEach(f => {
            html += `<div class="fp${f.id === App.currentFarm ? ' active' : ''}" onclick="App.setFarm('${f.id}')">${f.name}</div>`;
        });
        bar.innerHTML = html;
    },

    async renderHangarBar() {
        const bar = document.getElementById('hangarBar');
        if (!bar) return;
        if (!App.currentFarm) { bar.innerHTML = ''; return; }
        const hs = await db.hangars.where('farmId').equals(App.currentFarm).toArray();
        let html = `<div class="hp${App.currentHangar === null ? ' active' : ''}" onclick="App.setHangar(null)">الكل</div>`;
        hs.forEach(h => {
            html += `<div class="hp${h.id === App.currentHangar ? ' active' : ''}" onclick="App.setHangar('${h.id}')">${h.name}</div>`;
        });
        bar.innerHTML = html;
    },

    async renderDash() {
        const page = document.getElementById('page-dash');
        if (!page) return;
        const bids = await App.getBatchIds();
        const batches = await db.batches.where('id').anyOf(bids).and(b => b.active).toArray();
        const birds = batches.reduce((s, b) => s + b.count, 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const waStr = weekAgo.toISOString().split('T')[0];
        const allDeathsWeek = (await db.deaths.where('batchId').anyOf(bids).and(d => d.date >= waStr).toArray());
        const deathsWeek = allDeathsWeek.reduce((s, d) => s + d.count, 0);

        const lastWeights = [];
        for (const b of batches) {
            const lw = await db.weights.where('batchId').equals(b.id).reverse().first();
            if (lw) lastWeights.push(lw.weight);
        }
        const avgW = lastWeights.length ? (lastWeights.reduce((a, b) => a + b, 0) / lastWeights.length).toFixed(2) : '-';

        const inc = (await db.sales.where('batchId').anyOf(bids).toArray()).reduce((s, x) => s + x.total, 0);
        const cCst = batches.reduce((s, b) => s + (b.startCount * (b.price || 0)), 0);
        let sCst = 0;
        if (App.currentFarm) {
            const stf = await db.staff.where('farmId').equals(App.currentFarm).toArray();
            sCst = stf.reduce((t, s) => t + (s.allowance + s.advance) * Utils.fridays(s.startDate), 0);
        }
        const oExp = (await db.expenses.toArray()).reduce((s, x) => s + x.amount, 0);
        const tExp = cCst + oExp + sCst;
        const pr = inc - tExp;

        let html = '';

        if (App.currentFarm) {
            const stock = await this.getFeedStock(App.currentFarm);
            if (stock && stock.bags < 10) html += `<div class="alert">⚠️ مخزن منخفض: ${stock.bags.toFixed(1)} شيكارة</div>`;
        }
        for (const b of batches) {
            const bDeathsWeek = (await db.deaths.where('batchId').equals(b.id).and(d => d.date >= waStr).toArray()).reduce((s, d) => s + d.count, 0);
            if (b.startCount && (bDeathsWeek / b.startCount) * 100 >= 3) html += `<div class="alert">⚠️ ${b.name}: نفوق مرتفع</div>`;
        }

        for (const b of batches) {
            const prediction = await Analytics.predictBestSellDate(b.id, b.target || 2.5);
            if (prediction && prediction.daysNeeded <= 3) {
                html += `<div class="alert ai">📅 ${b.name}: متوقع الوصول لوزن ${b.target} كجم خلال ${prediction.daysNeeded} يوم (${prediction.date})</div>`;
            }
        }

        html += `<div class="qabar">`;
        const actions = [
            { ic: '⚖️', lb: 'وزن', fn: "Modals.open('addWeight')" },
            { ic: '💀', lb: 'نفوق', fn: "Modals.open('addDeath')" },
            { ic: '🌾', lb: 'علف', fn: "Modals.open('addFeed')" },
            { ic: '💰', lb: 'بيع', fn: "Modals.open('addSale')" },
            { ic: '🌡', lb: 'حرارة', fn: "Modals.open('addTemp')" },
            { ic: '📷', lb: 'صورة', fn: "Modals.open('addPhoto')" },
            { ic: '📦', lb: 'مخزن', fn: "Modals.open('storeIn')" }
        ];
        actions.forEach(a => html += `<div class="qa" onclick="${a.fn}"><div class="qa-ic">${a.ic}</div><div class="qa-lb">${a.lb}</div></div>`);
        html += `</div>`;

        html += `<div id="wxWidget"></div>`;

        // 📈 توقعات البيع الجديدة
        const predictionsHtml = [];
        for (const b of batches) {
            const prediction = await Analytics.predictBestSellDate(b.id, b.target || 2.5);
            if (prediction && prediction.daysNeeded > 0) {
                predictionsHtml.push(`<div class="bc"><div class="rb"><div><b>${b.name}</b><br><small>${prediction.daysNeeded} يوم متبقي</small></div><div style="color:var(--a);font-weight:900">${prediction.date}</div></div></div>`);
            }
        }
        if (predictionsHtml.length) {
            html += `<div class="card"><div class="card-title">📈 توقعات البيع</div>${predictionsHtml.join('')}</div>`;
        }

        html += `<div class="sg">
            <div class="stat"><div class="sn">${Utils.fmt(birds)}</div><div class="sl">طيور</div></div>
            <div class="stat w"><div class="sn">${batches.length}</div><div class="sl">دفعات</div></div>
            <div class="stat r"><div class="sn">${deathsWeek}</div><div class="sl">نفوق أسبوع</div></div>
            <div class="stat b"><div class="sn">${avgW}</div><div class="sl">وزن كجم</div></div>
        </div>`;

        html += `<div class="card"><div class="card-title">💰 الملخص المالي</div>
            <div class="g2" style="margin-bottom:9px">
                <div><div style="font-size:.66rem;color:var(--muted)">مبيعات</div><div style="font-size:1rem;font-weight:900;color:var(--a)">${Utils.fmt(Math.round(inc))} ج.م</div></div>
                <div><div style="font-size:.66rem;color:var(--muted)">مصاريف</div><div style="font-size:1rem;font-weight:900;color:var(--danger)">${Utils.fmt(Math.round(tExp))} ج.م</div></div>
            </div>
            <div class="sep"></div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:8px">صافي الربح</div>
            <div style="font-size:1.3rem;margin-top:2px" class="${pr >= 0 ? 'pp' : 'pn'}">${(pr >= 0 ? '+' : '') + Utils.fmt(Math.round(pr))} ج.م</div></div>`;

        html += `<div class="sec-t">🐔 الدفعات النشطة</div><div id="dashBatches">`;
        if (batches.length) {
            for (const b of batches) {
                const hn = await db.hangars.get(b.hangarId);
                const fm = hn ? await db.farms.get(hn.farmId) : null;
                const lw = await db.weights.where('batchId').equals(b.id).reverse().first();
                const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s, x) => s + x.qty, 0);
                const fcr = lw && fKg && b.startCount ? (fKg / (b.startCount * lw.weight)).toFixed(2) : '-';
                html += `<div class="bc"><div class="rb"><div><b>${b.name}</b><br><small>${fm ? fm.name + ' · ' : ''}${hn ? hn.name + ' · ' : ''}${Utils.dAge(b.date)} يوم</small></div><span class="badge bg">نشطة</span></div>
                    <div class="g3"><div>${Utils.fmt(b.count)}</div><div>${lw ? lw.weight + ' كجم' : '-'}</div><div>${fcr}</div></div></div>`;
            }
        } else {
            html += `<div class="empty">لا دفعات نشطة</div>`;
        }
        html += `</div>`;

        page.innerHTML = html;

        const wData = await Weather.renderWidget('hdrTemp');
        if (wData) {
            const widget = document.getElementById('wxWidget');
            if (widget) {
                const { w, rec, tOk, hOk, avg } = wData;
                widget.innerHTML = `<div class="wx"><div class="rb"><div><div class="wx-t">${w.temp}°C</div><div>💧 ${w.hum}%</div></div><div><span class="badge ${tOk ? 'bg' : 'br'}">${tOk ? '✅' : '⚠️'} حرارة</span><br><span class="badge ${hOk ? 'bg' : 'by'}">${hOk ? '✅' : '⚠️'} رطوبة</span></div></div><div>مثالي لعمر ${avg} يوم: ${rec.mn}–${rec.mx}° / ${rec.hn}–${rec.hx}%</div></div>`;
            }
        }
    },

    async renderFarmTree() {
        // ... باقي الدوال بدون تغيير
    },
    // ... (باقي الملف كما هو دون أي تغيير آخر)
};
