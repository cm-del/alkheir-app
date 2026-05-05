class ErrorHandler {
    constructor() {
        this.errorLog = [];
    }

    log(error) {
        const timestamp = new Date().toISOString();
        this.errorLog.push({ timestamp, error });
        console.error(`[${timestamp}] Error:`, error);
    }

    handle(error) {
        this.log(error);
        // Add custom handling logic here
    }

    getRecent() {
        return this.errorLog.slice(-5); // return last 5 errors
    }

    clear() {
        this.errorLog = [];
    }
}

const errorHandler = new ErrorHandler();

export default errorHandler;