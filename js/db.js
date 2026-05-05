'use strict';
const db = new Dexie('AlkheirDB');
db.version(2).stores({
    farms: 'id',
    hangars: 'id, farmId',
    batches: 'id, hangarId, active',
    weights: 'id, batchId, date',
    feed: 'id, batchId, date',
    deaths: 'id, batchId, date',
    sales: 'id, batchId, date',
    expenses: 'id, batchId, date',
    feedStore: 'id, farmId, date',
    staff: 'id, farmId',
    tempLogs: 'id, hangarId, date',
    photos: 'id',
    equipment: 'id',
    marketPrices: 'id',
    clients: 'id',
    clientSales: 'id, clientId',
    agenda: 'id',
    settings: 'key'
});

// دوال التحقق من صحة البيانات
const Validator = {
    requiredFields: {
        farms: ['id', 'name'],
        hangars: ['id', 'name', 'farmId'],
        batches: ['id', 'name', 'hangarId', 'count', 'startCount', 'date'],
        weights: ['id', 'batchId', 'weight', 'date'],
        feed: ['id', 'batchId', 'bags', 'qty', 'date'],
        deaths: ['id', 'batchId', 'count', 'date'],
        sales: ['id', 'batchId', 'count', 'weight', 'price', 'total', 'date'],
        expenses: ['id', 'amount', 'date'],
        feedStore: ['id', 'farmId', 'bags', 'kg', 'date'],
        staff: ['id', 'farmId', 'name'],
        tempLogs: ['id', 'hangarId', 'temp', 'date'],
        marketPrices: ['id', 'price', 'date'],
        clients: ['id', 'name'],
        clientSales: ['id', 'clientId', 'amount', 'date'],
        agenda: ['id', 'date']
    },

    validate(table, data) {
        const required = this.requiredFields[table];
        if (!required) return true; // الجداول غير المعروفة تمر بدون تحقق

        for (const field of required) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                console.error(`❌ تحقق فشل في ${table}: الحقل "${field}" مطلوب.`, data);
                Utils.toast(`بيانات ناقصة: ${field}`, 'error');
                return false;
            }
        }

        // تحقق إضافي للأنواع الرقمية
        if (table === 'batches' && (isNaN(data.count) || data.count <= 0)) {
            Utils.toast('عدد الطيور يجب أن يكون رقماً موجباً', 'error');
            return false;
        }
        if (table === 'weights' && (isNaN(data.weight) || data.weight <= 0)) {
            Utils.toast('الوزن يجب أن يكون رقماً موجباً', 'error');
            return false;
        }
        if (table === 'deaths' && (isNaN(data.count) || data.count <= 0)) {
            Utils.toast('عدد النافق يجب أن يكون رقماً موجباً', 'error');
            return false;
        }
        if (table === 'feed' && (isNaN(data.qty) || data.qty <= 0)) {
            Utils.toast('كمية العلف يجب أن تكون رقماً موجباً', 'error');
            return false;
        }
        if (table === 'sales' && (isNaN(data.total) || data.total <= 0)) {
            Utils.toast('إجمالي البيع يجب أن يكون رقماً موجباً', 'error');
            return false;
        }

        return true;
    }
};

// تهيئة الإعدادات الافتراضية لو مش موجودة
async function initDefaults() {
    if (!(await db.settings.get('weightUnit'))) {
        await db.settings.put({ key: 'weightUnit', value: 'kg' });
    }
    if (!(await db.settings.get('currency'))) {
        await db.settings.put({ key: 'currency', value: 'EGP' });
    }
    if (!(await db.settings.get('firstRun'))) {
        await db.settings.put({ key: 'firstRun', value: 'done' });
    }
    if (!(await db.settings.get('lowStockThreshold'))) {
        await db.settings.put({ key: 'lowStockThreshold', value: '10' });
    }
}

// ترحيل البيانات من localStorage القديم
async function migrateFromLocalStorage() {
    const old = localStorage.getItem('akh_v9');
    if (!old) return;
    const data = JSON.parse(old);
    if (data.farms) await db.farms.bulkPut(data.farms);
    if (data.hangars) await db.hangars.bulkPut(data.hangars);
    if (data.batches) await db.batches.bulkPut(data.batches);
    if (data.weights) await db.weights.bulkPut(data.weights);
    if (data.feed) await db.feed.bulkPut(data.feed);
    if (data.deaths) await db.deaths.bulkPut(data.deaths);
    if (data.sales) await db.sales.bulkPut(data.sales);
    if (data.expenses) await db.expenses.bulkPut(data.expenses);
    if (data.feedStore) await db.feedStore.bulkPut(data.feedStore);
    if (data.staff) await db.staff.bulkPut(data.staff);
    if (data.tempLogs) await db.tempLogs.bulkPut(data.tempLogs);
    if (data.photos) await db.photos.bulkPut(data.photos);
    if (data.marketPrices) await db.marketPrices.bulkPut(data.marketPrices);
    if (data.clients) await db.clients.bulkPut(data.clients);
    if (data.clientSales) await db.clientSales.bulkPut(data.clientSales);
    if (data.agenda) await db.agenda.bulkPut(data.agenda);
    localStorage.removeItem('akh_v9');
    console.log('تم ترحيل البيانات');
                    } 
