const TIMER_STORAGE_KEY = "kit-crew.todo.timer.v1";

function emptyTimerState() {
    return {
        selectedTaskId: null,
        status: "idle",
        startedAt: null,
        elapsedBeforeStartMs: 0,
        bonusMinutes: 0,
    };
}

function isValidTimerState(value) {
    return Boolean(
        value
        && ["idle", "running", "paused"].includes(value.status)
        && (value.selectedTaskId === null || typeof value.selectedTaskId === "string")
        && (value.startedAt === null || Number.isFinite(value.startedAt))
        && Number.isFinite(value.elapsedBeforeStartMs)
        && Number.isFinite(value.bonusMinutes),
    );
}

export class FocusTimer {
    constructor() {
        this.state = this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(TIMER_STORAGE_KEY);
            if (!raw) {
                return emptyTimerState();
            }

            const parsed = JSON.parse(raw);
            return isValidTimerState(parsed) ? parsed : emptyTimerState();
        } catch {
            return emptyTimerState();
        }
    }

    save() {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(this.state));
    }

    get selectedTaskId() {
        return this.state.selectedTaskId;
    }

    get status() {
        return this.state.status;
    }

    selectTask(taskId) {
        if (taskId === this.state.selectedTaskId) {
            return;
        }

        this.state = {
            ...emptyTimerState(),
            selectedTaskId: taskId,
        };
        this.save();
    }

    clearSelection() {
        this.state = emptyTimerState();
        this.save();
    }

    start() {
        if (!this.state.selectedTaskId) {
            return;
        }

        this.state.status = "running";
        this.state.startedAt = Date.now();
        this.state.elapsedBeforeStartMs = 0;
        this.state.bonusMinutes = 0;
        this.save();
    }

    pause() {
        if (this.state.status !== "running" || this.state.startedAt === null) {
            return;
        }

        this.state.elapsedBeforeStartMs += Date.now() - this.state.startedAt;
        this.state.startedAt = null;
        this.state.status = "paused";
        this.save();
    }

    resume() {
        if (this.state.status !== "paused") {
            return;
        }

        this.state.status = "running";
        this.state.startedAt = Date.now();
        this.save();
    }

    addMinute() {
        if (!["running", "paused"].includes(this.state.status)) {
            return;
        }

        this.state.bonusMinutes += 1;
        this.save();
    }

    elapsedMinutes(now = Date.now()) {
        let elapsedMs = this.state.elapsedBeforeStartMs;

        if (this.state.status === "running" && this.state.startedAt !== null) {
            elapsedMs += now - this.state.startedAt;
        }

        return Math.floor(Math.max(0, elapsedMs) / 60000);
    }

    displayValue(estimateMinutes, now = Date.now()) {
        if (!Number.isFinite(estimateMinutes)) {
            return "(—)";
        }

        if (this.state.status === "idle") {
            return `(${estimateMinutes})`;
        }

        const allowance = estimateMinutes + this.state.bonusMinutes;
        const remaining = allowance - this.elapsedMinutes(now);

        if (remaining >= 0) {
            return `(${remaining})`;
        }

        return `(+${Math.abs(remaining)})`;
    }
}
