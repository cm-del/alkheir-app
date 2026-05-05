'use strict';
const Notifications = {
    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        const result = await Notification.requestPermission();
        return result === 'granted';
    },

    schedule(msg, delayMs, tag = 'alkheir') {
        if (!('Notification' in window)) return;
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification('🐔 الخير للدواجن', {
                    body: msg,
                    icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAtklEQVRoge3WMQ6CQBBF0Q8TjPc/GhstLK3UQo1GjUaj0egfJqRks5n9CQkJIf/z9s3+QpIkSZIk/dM6s0TMLMpPXIwxYoycc2ZmuM4pU8MLbK/qey+R+Rh4YBFwkXvsa5vYD0we+GYBT8zAq+3F/0cK7uBZBVysyJ6FaHzlwH0kk7u8O5LJHXhHMrkFO7CzR0YyuQXvSCb3sVXlvsB3ArOB9wVWCR4MJEk/PW8CbhuoO/TvIAAAAABJRU5ErkJggg==',
                    tag,
                    requireInteraction: true
                });
            }
        }, delayMs);
    },

    scheduleAt(msg, dateStr, timeStr = '08:00') {
        const [h, m] = timeStr.split(':');
        const target = new Date(dateStr);
        target.setHours(+h || 8, +m || 0, 0);
        const now = Date.now();
        const delay = target.getTime() - now;
        if (delay > 0) this.schedule(msg, delay);
    },

    async scheduleAgendaReminders() {
        if (!(await this.requestPermission())) return;
        const agenda = await db.agenda.where('done').equals(false).toArray();
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        for (const item of agenda) {
            const itemDate = new Date(item.date);
            if (itemDate >= now && itemDate <= oneWeekFromNow) {
                const msg = `📅 ${item.type}: ${item.note || 'بدون ملاحظات'}`;
                this.scheduleAt(msg, item.date, '08:00');
            }
        }
    }
};
