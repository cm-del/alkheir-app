'use strict';
const db = new Dexie('AlkheirDB');
db.version(1).stores({
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
    agenda: 'id'
});

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