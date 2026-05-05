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
        const page = document.getElementById('page-hangars');
        if (!page) return;
        const farms = await db.farms.toArray();
        if (!farms.length) {
            page.innerHTML = '<div class="empty">لا مزارع<br><button class="btn btn-g" onclick="Modals.open(\'addFarm\')">+ مزرعة</button></div>';
            return;
        }
        let html = '';
        for (const f of farms) {
            const hs = await db.hangars.where('farmId').equals(f.id).toArray();
            const st = await this.getFeedStock(f.id);
            const sf = await db.staff.where('farmId').equals(f.id).toArray();
            html += `<div class="card" style="border-right:3px solid var(--a2)"><div class="rb"><div><b style="color:var(--a2)">🏡 ${f.name}</b><br><small>🌾${st.bags.toFixed(1)} ش · 👥${sf.length}</small></div><div><button class="btn btn-sm" onclick="Modals.open('addHangar', null, '${f.id}')">+ عنبر</button><button class="ebtn" onclick="Modals.open('editFarm', '${f.id}')">✏️</button></div></div>`;
            for (const h of hs) {
                const acts = await db.batches.where('hangarId').equals(h.id).and(b => b.active).toArray();
                const birds = acts.reduce((s, b) => s + b.count, 0);
                html += `<div class="hi"><div class="rb"><div><b>🏠 ${h.name}</b><br><small>${acts.length} دفعة · ${Utils.fmt(birds)} طير</small></div><div><button class="btn btn-sm btn-outline" onclick="Modals.open('addBatch', null, '${h.id}')">+ دفعة</button><button class="ebtn" onclick="Modals.open('editHangar', '${h.id}')">✏️</button></div></div></div>`;
            }
            html += `</div>`;
        }
        page.innerHTML = html;
    },

    async renderStore() {
        const page = document.getElementById('page-store');
        if (!page) return;
        if (!App.currentFarm) { page.innerHTML = '<div class="empty">اختر مزرعة</div>'; return; }
        const st = await this.getFeedStock(App.currentFarm);
        const low = st.bags < 10;
        let html = `<div class="stock${low ? ' low' : ''}"><div><div>المخزن</div><div style="font-size:1.9rem;font-weight:900">${st.bags.toFixed(1)}</div><div>${Utils.fmt(Math.round(st.kg))} كجم</div></div><button class="btn btn-g btn-sm" onclick="Modals.open('storeIn')">+ استلام</button></div>`;
        if (low) html += '<div class="alert">⚠️ المخزن منخفض!</div>';
        const records = await db.feedStore.where('farmId').equals(App.currentFarm).reverse().sortBy('date');
        html += `<div class="card"><div class="card-title">📋 حركات المخزن</div>`;
        if (records.length) {
            html += `<div class="tw"><table><thead><tr><th>تاريخ</th><th>نوع</th><th>كمية</th></tr></thead><tbody>`;
            records.forEach(r => {
                html += `<tr><td>${Utils.fD(r.date)}</td><td><span class="badge ${r.txType === 'in' ? 'bg' : 'br'}">${r.txType === 'in' ? 'وارد' : 'صادر'}</span></td><td>${r.bags} شيكارة</td></tr>`;
            });
            html += `</tbody></table></div>`;
        } else html += `<div class="empty">لا حركات</div>`;
        html += `</div>`;
        page.innerHTML = html;
    },

    currentDTab: 'w',
    switchDTab(tab, btn) {
        this.currentDTab = tab;
        document.querySelectorAll('#dataTabs .it').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderDTab();
    },
    async renderDTab() {
        const el = document.getElementById('dataContent');
        if (!el) return;
        const bids = await App.getBatchIds();
        let html = '';
        const tab = this.currentDTab;

        if (tab === 'w') {
            html += `<button class="btn btn-g" onclick="Modals.open('addWeight')">+ وزن</button>`;
            const rows = (await db.weights.where('batchId').anyOf(bids).toArray()).sort((a, b) => b.date.localeCompare(a.date));
            html += `<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>وزن</th><th>تاريخ</th><th></th></tr></thead><tbody>`;
            for (const w of rows) {
                const b = await db.batches.get(w.batchId);
                html += `<tr><td>${b ? b.name : '-'}</td><td style="color:var(--a);font-weight:700">${w.weight} كجم</td><td>${Utils.fD(w.date)}</td><td><button class="dbtn" onclick="db.weights.delete('${w.id}');UI.renderDTab();">×</button></td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        } else if (tab === 'f') {
            html += `<button class="btn btn-g" onclick="Modals.open('addFeed')">+ علف</button>`;
            const rows = (await db.feed.where('batchId').anyOf(bids).toArray()).sort((a, b) => b.date.localeCompare(a.date));
            html += `<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>كمية</th><th>تاريخ</th><th></th></tr></thead><tbody>`;
            for (const f of rows) {
                const b = await db.batches.get(f.batchId);
                html += `<tr><td>${b ? b.name : '-'}</td><td>${f.bags} شيكارة</td><td>${Utils.fD(f.date)}</td><td><button class="dbtn" onclick="db.feed.delete('${f.id}');UI.renderDTab();">×</button></td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        } else if (tab === 'd') {
            html += `<button class="btn btn-r" onclick="Modals.open('addDeath')">+ نفوق</button>`;
            const rows = (await db.deaths.where('batchId').anyOf(bids).toArray()).sort((a, b) => b.date.localeCompare(a.date));
            html += `<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>عدد</th><th>تاريخ</th><th></th></tr></thead><tbody>`;
            for (const d of rows) {
                const b = await db.batches.get(d.batchId);
                html += `<tr><td>${b ? b.name : '-'}</td><td style="color:var(--danger)">${d.count}</td><td>${Utils.fD(d.date)}</td><td><button class="dbtn" onclick="db.deaths.delete('${d.id}');UI.renderDTab();">×</button></td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        } else if (tab === 's') {
            html += `<button class="btn btn-o" onclick="Modals.open('addSale')">+ بيع</button>`;
            const rows = (await db.sales.where('batchId').anyOf(bids).toArray()).sort((a, b) => b.date.localeCompare(a.date));
            html += `<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>إجمالي</th><th>تاريخ</th><th></th></tr></thead><tbody>`;
            for (const s of rows) {
                const b = await db.batches.get(s.batchId);
                html += `<tr><td>${b ? b.name : '-'}</td><td style="color:var(--a)">${Utils.fmt(s.total)} ج.م</td><td>${Utils.fD(s.date)}</td><td><button class="dbtn" onclick="db.sales.delete('${s.id}');UI.renderDTab();">×</button></td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        } else if (tab === 'e') {
            html += `<button class="btn btn-b" onclick="Modals.open('addExpense')">+ مصروف</button>`;
            const rows = (await db.expenses.toArray()).sort((a, b) => b.date.localeCompare(a.date));
            html += `<div class="card"><div class="tw"><table><thead><tr><th>نوع</th><th>مبلغ</th><th>تاريخ</th><th></th></tr></thead><tbody>`;
            for (const e of rows) {
                html += `<tr><td>${e.type}</td><td style="color:var(--danger)">${Utils.fmt(e.amount)} ج.م</td><td>${Utils.fD(e.date)}</td><td><button class="dbtn" onclick="db.expenses.delete('${e.id}');UI.renderDTab();">×</button></td></tr>`;
            }
            html += `</tbody></table></div></div>`;
        } else if (tab === 'st') {
            if (!App.currentFarm) { el.innerHTML = '<div class="empty">اختر مزرعة</div>'; return; }
            const staff = await db.staff.where('farmId').equals(App.currentFarm).toArray();
            html += `<button class="btn btn-g" onclick="Modals.open('addStaff')">+ موظف</button>`;
            let total = 0;
            for (const s of staff) {
                const fr = Utils.fridays(s.startDate);
                const totalS = (s.allowance + s.advance) * fr;
                total += totalS;
                html += `<div class="sc"><div>${s.name} <span class="badge bp">${s.role}</span><br><small>${fr} جمعة · ${Utils.fmt(Math.round(totalS))} ج.م</small></div><button class="dbtn" onclick="db.staff.delete('${s.id}');UI.renderDTab();">×</button></div>`;
            }
            html += `<div class="card"><div class="card-title">💼 الإجمالي: ${Utils.fmt(Math.round(total))} ج.م</div></div>`;
        } else if (tab === 'cmp') {
            const batches = await db.batches.where('id').anyOf(bids).toArray();
            html += `<div class="card"><div class="card-title">🔄 مقارنة الدفعات</div><div class="tw"><table><thead><tr><th>الدفعة</th><th>العدد</th><th>العمر</th><th>FCR</th><th>نفوق</th><th>تكلفة/كجم</th><th>ربح</th></tr></thead><tbody>`;
            for (const b of batches) {
                const lw = (await db.weights.where('batchId').equals(b.id).reverse().first());
                const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s, x) => s + x.qty, 0);
                const fcr = lw && fKg && b.startCount ? (fKg / (b.startCount * lw.weight)).toFixed(2) : '-';
                const deaths = (await db.deaths.where('batchId').equals(b.id).toArray()).reduce((s, d) => s + d.count, 0);
                const costData = await Analytics.costPerKg(b.id);
                html += `<tr>
                    <td>${b.name}</td>
                    <td>${b.count}</td>
                    <td>${Utils.dAge(b.date)} يوم</td>
                    <td>${fcr}</td>
                    <td>${deaths}</td>
                    <td>${costData ? costData.costPerKg.toFixed(2) + ' ج.م' : '-'}</td>
                    <td style="color:${costData && costData.profit >= 0 ? 'var(--a)' : 'var(--danger)'}">${costData ? Utils.fmt(Math.round(costData.profit)) + ' ج.م' : '-'}</td>
                </tr>`;
            }
            html += '</tbody></table></div></div>';
        }
        el.innerHTML = html;
    },

    currentTTab: 'log',
    switchTTab(tab, btn) {
        this.currentTTab = tab;
        document.querySelectorAll('#page-temp .it').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderTTab();
    },
    async renderTTab() {
        const el = document.getElementById('tempContent');
        if (!el) return;
        const hangars = App.currentHangar ? [await db.hangars.get(App.currentHangar)] :
            App.currentFarm ? await db.hangars.where('farmId').equals(App.currentFarm).toArray() :
            await db.hangars.toArray();
        let html = '';
        if (this.currentTTab === 'log') {
            html += `<button class="btn btn-g" onclick="Modals.open('addTemp')">+ حرارة</button>`;
            for (const hn of hangars.filter(Boolean)) {
                const logs = (await db.tempLogs.where('hangarId').equals(hn.id).toArray())
                    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 20);
                html += `<div class="card"><div class="card-title">🌡 ${hn.name}</div>`;
                logs.forEach(tl => {
                    html += `<div class="trow"><div class="ttime">${tl.date.slice(5)}<br>${tl.time}</div><div style="font-weight:900">${tl.temp}°C</div></div>`;
                });
                if (logs.length >= 2) {
                    html += `<div class="chart-w"><canvas id="tempChart-${hn.id}"></canvas></div>`;
                    setTimeout(() => {
                        Charts.renderTempChart(`tempChart-${hn.id}`, logs.reverse());
                    }, 100);
                }
                html += `</div>`;
            }
        } else {
            for (const hn of hangars.filter(Boolean)) {
                const acts = await db.batches.where('hangarId').equals(hn.id).and(b => b.active).toArray();
                const birds = acts.reduce((s, b) => s + b.count, 0);
                const actual = (hn.fans || 0) * (hn.fanCap || 0);
                html += `<div class="card"><div class="card-title">💨 ${hn.name}</div><div>طيور: ${Utils.fmt(birds)} | قدرة: ${Utils.fmt(actual)} م³/س</div><div class="${actual ? 'ao' : 'alert'} alert">${actual ? '✅ تهوية كافية' : '⚠️ راجع التهوية'}</div></div>`;
            }
        }
        el.innerHTML = html || '<div class="empty">لا عنابر</div>';
    },

    currentRefTab: 'disease',
    switchRefTab(tab, btn) {
        this.currentRefTab = tab;
        document.querySelectorAll('#page-ref .it').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderRef();
    },
    async renderRef() {
        const el = document.getElementById('refContent');
        if (!el) return;
        if (this.currentRefTab === 'disease') {
            const DIS = [
                { n: 'نيوكاسل', s: 'أعراض تنفسية، إسهال أخضر، التواء الرقبة', t: 'لقاح، عزل', p: 'تحصين منتظم' },
                { n: 'الجمبورو', s: 'إسهال أبيض، خمول، نفوق مفاجئ', t: 'لقاح، رفع الحرارة', p: 'تحصين في العمر المناسب' },
                { n: 'الكوكسيديا', s: 'إسهال دموي، ضعف، فقدان شهية', t: 'مضادات كوكسيديا', p: 'فرشة جافة وتهوية' },
                { n: 'الإجهاد الحراري', s: 'لهاث، أجنحة ممدودة، نفوق', t: 'تبريد، فيتامين C', p: 'مراقبة الحرارة' },
                { n: 'إنفلونزا الطيور', s: 'زرقة العرف، تورم الرأس، نفوق عالي', t: 'إبلاغ الطبيب فوراً', p: 'أمن حيوي صارم' }
            ];
            el.innerHTML = DIS.map(d => `<div class="card"><div class="card-title">🦠 ${d.n}</div><div><b>أعراض:</b> ${d.s}</div><div><b>علاج:</b> ${d.t}</div><div><b>وقاية:</b> ${d.p}</div></div>`).join('');
        } else {
            el.innerHTML = `<div class="itabs"><button class="it active" onclick="UI.analyticsTab='fcr';UI.renderAnalytics()">📊 FCR</button><button class="it" onclick="UI.analyticsTab='grow';UI.renderAnalytics()">📈 نمو</button></div><div id="analyticsInner"></div>`;
            this.analyticsTab = 'fcr';
            this.renderAnalytics();
        }
    },
    analyticsTab: 'fcr',
    async renderAnalytics() {
        const el = document.getElementById('analyticsInner');
        if (!el) return;
        const bids = await App.getBatchIds();
        const batches = await db.batches.where('id').anyOf(bids).and(b => b.active).toArray();
        if (this.analyticsTab === 'fcr') {
            let html = '';
            for (const b of batches) {
                const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s, x) => s + x.qty, 0);
                const lw = (await db.weights.where('batchId').equals(b.id).reverse().sortBy('date'))[0];
                const fcr = lw && fKg && b.startCount ? (fKg / (b.startCount * lw.weight)).toFixed(2) : '-';
                html += `<div class="fcr"><b>${b.name}</b> — FCR: <b style="color:var(--a2)">${fcr}</b> | علف: ${Utils.fmt(fKg)} كجم</div>`;
            }
            el.innerHTML = html || '<div class="empty">لا بيانات</div>';
        } else {
            el.innerHTML = `<div class="chart-w"><canvas id="growC"></canvas></div>`;
            const datasets = [];
            for (const b of batches) {
                const ws = await db.weights.where('batchId').equals(b.id).toArray();
                if (!ws.length) continue;
                const points = ws.map(w => ({ age: Utils.dAge(b.date) - Utils.dAge(w.date), weight: w.weight }));
                datasets.push({ name: b.name, weights: points });
            }
            setTimeout(() => Charts.renderGrowthChart('growC', datasets), 100);
        }
    },

    currentMoreTab: 'photos',
    switchMoreTab(tab, btn) {
        this.currentMoreTab = tab;
        document.querySelectorAll('#page-more .it').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        this.renderMore();
    },
    async renderMore() {
        const el = document.getElementById('moreContent');
        if (!el) return;
        let html = '';
        switch (this.currentMoreTab) {
            case 'photos':
                html += `<button class="btn btn-g" onclick="Modals.open('addPhoto')">+ صورة</button><div class="photo-grid">`;
                const photos = await db.photos.toArray();
                photos.reverse().forEach(p => {
                    html += `<div class="photo-item"><img src="${p.src}" onclick="window.open('${p.src}')"><button class="photo-del" onclick="db.photos.delete('${p.id}');UI.renderMore();">×</button></div>`;
                });
                html += `</div>`;
                if (!photos.length) html += '<div class="empty">لا صور</div>';
                break;
            case 'agenda':
                html += `<button class="btn btn-g" onclick="Modals.open('agenda')">+ موعد</button>`;
                const agenda = await db.agenda.toArray();
                agenda.sort((a, b) => a.date.localeCompare(b.date)).forEach(a => {
                    html += `<div class="card"><div class="rb"><div><b>${a.type}</b><br><small>${Utils.fD(a.date)} · ${a.note || ''}</small></div><button class="btn btn-sm btn-g" onclick="db.agenda.update(a.id, {done:true});UI.renderMore();">✓</button></div></div>`;
                });
                if (!agenda.length) html += '<div class="empty">لا مواعيد</div>';
                break;
            case 'clients':
                html += `<button class="btn btn-g" onclick="Modals.open('client')">+ عميل</button>`;
                const clients = await db.clients.toArray();
                for (const c of clients) {
                    const sales = await db.clientSales.where('clientId').equals(c.id).toArray();
                    const total = sales.reduce((s, x) => s + x.amount, 0);
                    const paid = sales.filter(s => s.paid).reduce((s, x) => s + x.amount, 0);
                    html += `<div class="card"><div class="rb"><div><b>${c.name}</b><br><small>مستحق: ${Utils.fmt(total - paid)} ج.م</small></div><button class="btn btn-sm btn-g" onclick="db.clientSales.where('clientId').equals('${c.id}').modify({paid:true});UI.renderMore();">سدد</button></div></div>`;
                }
                if (!clients.length) html += '<div class="empty">لا عملاء</div>';
                break;
            case 'market':
                html += `<button class="btn btn-g" onclick="Modals.open('marketPrice')">+ سعر</button><div class="chart-w"><canvas id="marketChart"></canvas></div>`;
                setTimeout(async () => {
                    const prices = await db.marketPrices.toArray();
                    const dates = [...new Set(prices.map(p => p.date))].sort();
                    const types = ['كتكوت', 'علف', 'بيع'];
                    const colors = ['#00e272', '#ffb703', '#38b6ff'];
                    const datasets = types.map((tp, i) => ({
                        label: tp,
                        data: dates.map(d => { const p = prices.filter(px => px.date === d && px.type === tp); return p.length ? p[p.length - 1].price : null; }),
                        borderColor: colors[i],
                        tension: 0.3,
                        pointRadius: 3
                    }));
                    new Chart(document.getElementById('marketChart'), {
                        type: 'line',
                        data: { labels: dates, datasets },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { labels: { color: '#dff5e8' } } },
                            scales: { x: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } }, y: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } } }
                        }
                    });
                }, 200);
                break;
            case 'backup':
                html += `<button class="btn btn-g" onclick="Export.backupJSON()">📤 تصدير نسخة JSON</button>
                    <label class="btn btn-o" style="margin-top:6px">📥 استيراد نسخة <input type="file" id="restore-file" accept=".json" style="display:none" onchange="Export.restoreJSON(this.files[0])"></label>`;
                break;
        }
        el.innerHTML = html;
    }
};
