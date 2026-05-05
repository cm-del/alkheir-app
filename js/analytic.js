'use strict';
const Analytics = {
    _cache: new Map(),

    // مسح كاش دفعة واحدة
    invalidateBatch(batchId) {
        this._cache.delete('predictWeight_' + batchId);
        this._cache.delete('costPerKg_' + batchId);
        this._cache.delete('mortality_' + batchId);
    },

    // مسح الكاش بالكامل
    clearCache() {
        this._cache.clear();
    },

    async predictWeight(batchId) {
        const cacheKey = 'predictWeight_' + batchId;
        if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

        const b = await db.batches.get(batchId);
        if (!b) return null;
        const weights = await db.weights.where('batchId').equals(batchId).toArray();
        if (weights.length < 3) return null;
        const ages = weights.map(w => Utils.dAge(b.date) - Utils.dAge(w.date));
        const vals = weights.map(w => w.weight);
        const n = ages.length;
        const sumX = ages.reduce((a,b)=>a+b,0);
        const sumY = vals.reduce((a,b)=>a+b,0);
        const sumXY = ages.reduce((s,x,i) => s + x*vals[i], 0);
        const sumX2 = ages.reduce((s,x) => s + x*x, 0);
        const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
        const intercept = (sumY - slope*sumX) / n;
        const result = { slope, intercept, predict(age) { return +(intercept + slope*age).toFixed(3); } };
        this._cache.set(cacheKey, result);
        return result;
    },

    async predictBestSellDate(batchId, targetWeight = 2.5) {
        const model = await this.predictWeight(batchId);
        if (!model || model.slope <= 0) return null;
        const b = await db.batches.get(batchId);
        if (!b) return null;
        const currentAge = Utils.dAge(b.date);
        const daysNeeded = Math.max(0, Math.ceil((targetWeight - model.intercept) / model.slope));
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + (daysNeeded - currentAge));
        return { date: targetDate.toISOString().split('T')[0], daysNeeded, model };
    },

    async costPerKg(batchId) {
        const cacheKey = 'costPerKg_' + batchId;
        if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

        const b = await db.batches.get(batchId);
        if (!b) return null;
        const feedKg = (await db.feed.where('batchId').equals(batchId).toArray()).reduce((s,x)=>s+x.qty,0);
        const deaths = (await db.deaths.where('batchId').equals(batchId).toArray()).reduce((s,d)=>s+d.count,0);
        const startCount = b.startCount || b.count;
        const lastFeedPrice = (await db.marketPrices.where('type').equals('علف').reverse().first())?.price || 0;
        const totalFeedCost = feedKg * (lastFeedPrice / 1000);
        const chickCost = startCount * (b.price || 0);
        const expenses = (await db.expenses.where('batchId').equals(batchId).toArray()).reduce((s,e)=>s+e.amount,0);
        const totalCost = chickCost + totalFeedCost + expenses;
        const totalSales = (await db.sales.where('batchId').equals(batchId).toArray()).reduce((s,x)=>s+x.total,0);
        const totalWeightSold = (await db.sales.where('batchId').equals(batchId).toArray()).reduce((s,x)=>s + (x.count * x.weight),0);
        const result = {
            cost: totalCost,
            weightSold: totalWeightSold,
            costPerKg: totalWeightSold ? totalCost / totalWeightSold : 0,
            revenue: totalSales,
            profit: totalSales - totalCost
        };
        this._cache.set(cacheKey, result);
        return result;
    },

    async getMortalityRate(batchId) {
        const cacheKey = 'mortality_' + batchId;
        if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

        const batch = await db.batches.get(batchId);
        if (!batch) return null;
        const startCount = batch.startCount || batch.count;
        if (!startCount || startCount <= 0) return null;
        const totalDeaths = (await db.deaths.where('batchId').equals(batchId).toArray()).reduce((s,d)=>s+d.count,0);
        const result = {
            startCount,
            totalDeaths,
            percentage: +((totalDeaths / startCount) * 100).toFixed(2),
            alive: startCount - totalDeaths
        };
        this._cache.set(cacheKey, result);
        return result;
    }
};
