const CONFIG = { PERFORMANCE: { PAGINATION_SIZE: 10 } };

class Pagination {
    constructor(data) {
        this.data = data;
        this.currentPage = 1;
        this.totalPages = Math.ceil(data.length / CONFIG.PERFORMANCE.PAGINATION_SIZE);
    }

    setData(data) {
        this.data = data;
        this.totalPages = Math.ceil(data.length / CONFIG.PERFORMANCE.PAGINATION_SIZE);
        this.currentPage = 1;
    }

    goToPage(page) {
        if (page > 0 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    getCurrentPage() {
        const startIdx = (this.currentPage - 1) * CONFIG.PERFORMANCE.PAGINATION_SIZE;
        return this.data.slice(startIdx, startIdx + CONFIG.PERFORMANCE.PAGINATION_SIZE);
    }

    next() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    prev() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    search(query) {
        return this.data.filter(item => item.includes(query));
    }

    sort(compareFunction) {
        this.data.sort(compareFunction);
        this.currentPage = 1; // Reset to first page after sorting
    }

    exportCurrentPage() {
        return this.getCurrentPage();
    }
}

export default Pagination;
