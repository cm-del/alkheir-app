'use strict';
const Export = {
    async toCSV() {
        try {
            const bids = await App.getBatchIds();
            if (!bids || bids.length === 0) {
                Utils.toast('لا توجد دفعات نشطة للتصدير', 'warning');
                return;
            }
            const batches = await db.batches.where('id').anyOf(bids).toArray();
            if (batches.length === 0) {
                Utils.toast('لا توجد دفعات للتصدير', 'warning');
                return;
            }
            let csv = '\uFEFFالدفعة,طيور,تاريخ,عمر,وزن,علف,نفوق,مبيعات\n';
            for (const b of batches) {
                const lw = (await db.weights.where('batchId').equals(b.id).reverse().sortBy('date'))[0];
                const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.qty,0);
                const dc = (await db.deaths.where('batchId').equals(b.id).toArray()).reduce((s,d)=>s+d.count,0);
                const sl = (await db.sales.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.total,0);
                csv += `${b.name},${b.count},${b.date},${Utils.dAge(b.date)},${lw?lw.weight:0},${(fKg/KPB).toFixed(1)},${dc},${Math.round(sl)}\n`;
            }
            const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'alkheir.csv';
            a.click();
            URL.revokeObjectURL(url);
            Utils.toast('تم تصدير CSV بنجاح', 'success');
        } catch (error) {
            console.error('Export CSV error:', error);
            Utils.toast('فشل تصدير CSV: ' + error.message, 'error');
        }
    },

    async shareReport() {
        try {
            const bids = await App.getBatchIds();
            if (!bids || bids.length === 0) {
                Utils.toast('لا توجد دفعات للمشاركة', 'warning');
                return;
            }
            const batches = await db.batches.where('id').anyOf(bids).toArray();
            if (batches.length === 0) {
                Utils.toast('لا توجد دفعات للمشاركة', 'warning');
                return;
            }
            let csv = '\uFEFFالدفعة,طيور,تاريخ,عمر,وزن,علف,نفوق,مبيعات\n';
            for (const b of batches) {
                const lw = (await db.weights.where('batchId').equals(b.id).reverse().sortBy('date'))[0];
                const fKg = (await db.feed.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.qty,0);
                const dc = (await db.deaths.where('batchId').equals(b.id).toArray()).reduce((s,d)=>s+d.count,0);
                const sl = (await db.sales.where('batchId').equals(b.id).toArray()).reduce((s,x)=>s+x.total,0);
                csv += `${b.name},${b.count},${b.date},${Utils.dAge(b.date)},${lw?lw.weight:0},${(fKg/KPB).toFixed(1)},${dc},${Math.round(sl)}\n`;
            }
            const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
            const file = new File([blob], 'تقرير_الخير.csv', { type: 'text/csv' });

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'تقرير الخير للدواجن',
                        files: [file]
                    });
                    Utils.toast('تمت المشاركة بنجاح', 'success');
                } catch (err) {
                    if (err.name === 'AbortError') {
                        // المستخدم لغى المشاركة، مش خطأ
                    } else {
                        Utils.toast('تعذرت المشاركة: ' + err.message, 'error');
                    }
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'تقرير_الخير.csv';
                a.click();
                URL.revokeObjectURL(url);
                Utils.toast('تم تحميل التقرير (المشاركة غير مدعومة)', 'warning');
            }
        } catch (error) {
            console.error('Share report error:', error);
            Utils.toast('فشلت المشاركة: ' + error.message, 'error');
        }
    },

    async toPDF() {
        try {
            const bids = await App.getBatchIds();
            if (!bids || bids.length === 0) {
                Utils.toast('لا توجد دفعات للتصدير', 'warning');
                return;
            }
            const batches = await db.batches.where('id').anyOf(bids).toArray();
            if (batches.length === 0) {
                Utils.toast('لا توجد دفعات للتصدير', 'warning');
                return;
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(18);
            doc.text('تقرير الخير للدواجن', 105, 20, { align: 'center' });

            let y = 30;
            doc.setFontSize(12);
            batches.forEach(b => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(`${b.name} - ${Utils.dAge(b.date)} يوم - ${b.count} طائر`, 10, y);
                y += 8;
            });
            doc.save('تقرير_الخير.pdf');
            Utils.toast('تم تصدير PDF بنجاح', 'success');
        } catch (error) {
            console.error('Export PDF error:', error);
            Utils.toast('فشل تصدير PDF: ' + error.message, 'error');
        }
    },

    async batchReport(batchId) {
        try {
            const b = await db.batches.get(batchId);
            if (!b) {
                Utils.toast('الدفعة غير موجودة', 'error');
                return;
            }
            const weights = await db.weights.where('batchId').equals(batchId).toArray();
            const feed = await db.feed.where('batchId').equals(batchId).toArray();
            const deaths = await db.deaths.where('batchId').equals(batchId).toArray();
            const sales = await db.sales.where('batchId').equals(batchId).toArray();
            const expenses = await db.expenses.where('batchId').equals(batchId).toArray();
            const costData = await Analytics.costPerKg(batchId);
            const mortality = await Analytics.getMortalityRate(batchId);
            const prediction = await Analytics.predictBestSellDate(batchId, b.target || 2.5);
            
            let report = `🐔 تقرير دفعة: ${b.name}\n`;
            report += `📅 التاريخ: ${b.date} | العمر: ${Utils.dAge(b.date)} يوم\n`;
            report += `🐥 العدد الحالي: ${b.count} (البداية: ${b.startCount})\n`;
            report += `💀 نسبة النفوق: ${mortality ? mortality.percentage + '%' : 'غير متاح'}\n`;
            report += `⚖️ آخر وزن: ${weights.length ? weights[weights.length-1].weight + ' كجم' : 'غير متاح'}\n`;
            report += `🌾 إجمالي العلف: ${feed.reduce((s,x)=>s+x.qty,0)} كجم\n`;
            report += `💰 إجمالي المبيعات: ${sales.reduce((s,x)=>s+x.total,0)} ج.م\n`;
            report += `📋 إجمالي المصاريف: ${expenses.reduce((s,x)=>s+x.amount,0)} ج.م\n`;
            if(costData) {
                report += `💵 تكلفة الكيلو: ${costData.costPerKg.toFixed(2)} ج.م | الربح: ${costData.profit.toFixed(0)} ج.م\n`;
            }
            if(prediction) {
                report += `📈 البيع المتوقع: ${prediction.date} (${prediction.daysNeeded} يوم)\n`;
            }
            const blob = new Blob([report], {type:'text/plain;charset=utf-8'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `تقرير_${b.name}.txt`;
            a.click();
            Utils.toast('تم تصدير تقرير الدفعة', 'success');
        } catch (error) {
            console.error('Batch report error:', error);
            Utils.toast('فشل تصدير تقرير الدفعة: ' + error.message, 'error');
        }
    },

    async backupJSON() {
        try {
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
            Utils.toast('تم تصدير النسخة الاحتياطية', 'success');
        } catch (error) {
            console.error('Backup JSON error:', error);
            Utils.toast('فشل تصدير النسخة الاحتياطية: ' + error.message, 'error');
        }
    },

    async restoreJSON(file) {
        try {
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
                    Utils.toast('تم استعادة البيانات بنجاح', 'success');
                    App.init();
                } catch (error) {
                    console.error('Restore JSON parse error:', error);
                    Utils.toast('فشل استعادة النسخة الاحتياطية: تنسيق ملف خاطئ', 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Restore JSON file read error:', error);
            Utils.toast('فشل قراءة الملف: ' + error.message, 'error');
        }
    }
}; 
