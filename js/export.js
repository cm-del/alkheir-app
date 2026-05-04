'use strict';
const Export = {
    async toCSV() {
        const bids = await App.getBatchIds();
        const batches = await db.batches.where('id').anyOf(bids).toArray();
        let csv = '\uFEFFالدفعة,طيور,تاريخ,عمر,وزن,علف,نفوق,مبيعات\n';
        for (const b of batches) {
            const lw = (await db.weights.where('batchId').equals(b.id).reverse().sortBy('date'))[0];
            const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.qty,0);
            const dc = (await db.deaths.where('batchId').equals(b.id).toArray()).reduce((s,d)=>s+d.count,0);
            const sl = (await db.sales.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.total,0);
            csv += `${b.name},${b.count},${b.date},${Utils.dAge(b.date)},${lw?lw.weight:0},${(fKg/KPB).toFixed(1)},${dc},${Math.round(sl)}\n`;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
        a.download = 'alkheir.csv';
        a.click();
    },
    async toPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(18);
        doc.text('تقرير الخير للدواجن', 105, 20, { align: 'center' });

        const bids = await App.getBatchIds();
        const batches = await db.batches.where('id').anyOf(bids).toArray();
        let y = 30;
        doc.setFontSize(12);
        batches.forEach(b => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${b.name} - ${Utils.dAge(b.date)} يوم - ${b.count} طائر`, 10, y);
            y += 8;
        });
        doc.save('تقرير_الخير.pdf');
    },
    async backupJSON() {
        const allData = {
            farms: await db.farms.toArray(),
            hangars: await db.hangars.toArray(),
            batches: await db.batches.toArray(),
            weights: await db.weights.toArray(),
            feed: await db.feed.toArray(),
            deaths: await db.deaths.toArray(),
            sales: await db.sales.toArray(),
            expenses: await db.expenses.toArray(),
            feedStore: await db.feedStore.toArray(),
            staff: await db.staff.toArray(),
            tempLogs: await db.tempLogs.toArray(),
            photos: await db.photos.toArray(),
            marketPrices: await db.marketPrices.toArray(),
            clients: await db.clients.toArray(),
            clientSales: await db.clientSales.toArray(),
            agenda: await db.agenda.toArray()
        };
        const blob = new Blob([JSON.stringify(allData, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_${Utils.todayS()}.json`;
        a.click();
    },
    async restoreJSON(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
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
                Utils.toast('تم استعادة البيانات بنجاح');
                App.init();
            } catch (error) {
                Utils.toast('فشل استعادة النسخة الاحتياطية', 'error');
            }
        };
        reader.readAsText(file);
    }
};