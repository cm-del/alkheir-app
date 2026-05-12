'use strict';
const App = {
    currentFarm: null,
    currentHangar: null,
    currentPage: 'dash',
    stateKey: 'alkheir_app_state_v1',

    saveState() {
        try {
            localStorage.setItem(this.stateKey, JSON.stringify({
                currentFarm: this.currentFarm,
                currentHangar: this.currentHangar,
                currentPage: this.currentPage
            }));
        } catch (_) {}
    },
    async restoreState() {
        try {
            const raw = localStorage.getItem(this.stateKey);
            if (!raw) return;
            const state = JSON.parse(raw);
            if (state.currentFarm && await db.farms.get(state.currentFarm)) {
                this.currentFarm = state.currentFarm;
            }
            if (state.currentHangar && await db.hangars.get(state.currentHangar)) {
                this.currentHangar = state.currentHangar;
            }
            if (state.currentPage && document.getElementById('page-' + state.currentPage)) {
                this.currentPage = state.currentPage;
            }
        } catch (_) {}
    },
    async init() {
        await migrateFromLocalStorage();
        const unlocked = await UI.checkLock();
        if (!unlocked) return;
        document.getElementById('hdrDate').textContent = new Date().toLocaleDateString('ar-EG', {weekday:'long', day:'numeric', month:'long'});
        await this.restoreState();
        if (!App.currentFarm && (await db.farms.count()) > 0) {
            App.currentFarm = (await db.farms.toArray())[0].id;
        }
        await UI.renderFarmBar();
        await UI.renderHangarBar();
        await this.showPage(this.currentPage);
        Weather.load().then(w => { if (w) document.getElementById('hdrTemp').textContent = w.temp + '°'; });
    },
    async showPage(id, btn) {
        this.currentPage = id;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.ni').forEach(b => b.classList.remove('active'));
        const page = document.getElementById('page-' + id);
        if (page) page.classList.add('active');
        if (btn) btn.classList.add('active');
        const hangarBar = document.getElementById('hangarBar');
        hangarBar.style.display = ['data','temp','ref','more'].includes(id) ? 'flex' : 'none';
        this.saveState();
        switch(id) {
            case 'dash': await UI.renderDash(); break;
            case 'hangars': await UI.renderFarmTree(); break;
            case 'store': await UI.renderStore(); break;
            case 'data': await UI.renderDTab(); break;
            case 'temp': await UI.renderTTab(); break;
            case 'ref': await UI.renderRef(); break;
            case 'more': await UI.renderMore(); break;
        }
    },
    async refreshCurrentPage() {
        await this.showPage(this.currentPage);
    },
    setFarm(id) {
        this.currentFarm = id;
        this.currentHangar = null;
        UI.renderFarmBar();
        UI.renderHangarBar();
        this.saveState();
    },
    setHangar(id) {
        this.currentHangar = id;
        UI.renderHangarBar();
        this.saveState();
    },
    async getBatchIds() {
        let batches;
        if (this.currentHangar) {
            batches = await db.batches.where('hangarId').equals(this.currentHangar).toArray();
        } else if (this.currentFarm) {
            const hs = await db.hangars.where('farmId').equals(this.currentFarm).toArray();
            const hids = hs.map(h => h.id);
            batches = await db.batches.where('hangarId').anyOf(hids).toArray();
        } else {
            batches = await db.batches.toArray();
        }
        return batches.map(b => b.id);
    }
};
window.addEventListener('DOMContentLoaded', () => App.init()); 
