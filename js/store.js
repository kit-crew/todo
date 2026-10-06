import { parseTaskLine } from "./parser.js";

const STORAGE_KEY = "kit-crew.todo.v2";
const ORDER_STEP = 1000;
const PRIORITY_RANK = Object.freeze({
    A: 1,
    B: 2,
    C: 3,
    D: 4,
});

function createId(prefix) {
    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initialPlacementCompare(left, right) {
    const leftParsed = parseTaskLine(left.text);
    const rightParsed = parseTaskLine(right.text);
    const rankDifference = (PRIORITY_RANK[leftParsed?.priority] ?? 99)
        - (PRIORITY_RANK[rightParsed?.priority] ?? 99);

    if (rankDifference !== 0) {
        return rankDifference;
    }

    const leftNumbered = Number.isInteger(leftParsed?.priorityNumber);
    const rightNumbered = Number.isInteger(rightParsed?.priorityNumber);

    if (leftNumbered && rightNumbered) {
        return leftParsed.priorityNumber - rightParsed.priorityNumber;
    }

    if (leftNumbered !== rightNumbered) {
        return leftNumbered ? -1 : 1;
    }

    return 0;
}

function starterState() {
    return {
        version: 2,
        sections: [
            {
                id: createId("section"),
                name: "Todo",
                order: ORDER_STEP,
            },
        ],
        tasks: [],
    };
}

function isValidState(value) {
    return Boolean(
        value
        && value.version === 2
        && Array.isArray(value.sections)
        && Array.isArray(value.tasks),
    );
}

export class TodoStore {
    constructor() {
        this.state = this.load();
        this.normalize();
        this.save();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return starterState();
            }

            const parsed = JSON.parse(raw);
            return isValidState(parsed) ? parsed : starterState();
        } catch {
            return starterState();
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    getSections() {
        return [...this.state.sections].sort((a, b) => a.order - b.order);
    }

    getTasks(sectionId) {
        return this.state.tasks
            .filter((task) => task.sectionId === sectionId)
            .sort((a, b) => a.order - b.order);
    }

    getAllTasks() {
        const sectionOrder = new Map(
            this.getSections().map((section, index) => [section.id, index]),
        );

        return [...this.state.tasks].sort((a, b) => {
            const sectionDifference = (sectionOrder.get(a.sectionId) ?? 99)
                - (sectionOrder.get(b.sectionId) ?? 99);
            return sectionDifference || a.order - b.order;
        });
    }

    getTask(taskId) {
        return this.state.tasks.find((task) => task.id === taskId) ?? null;
    }

    getTotalEstimatedMinutes() {
        return this.state.tasks.reduce((total, task) => {
            const estimate = parseTaskLine(task.text)?.estimateMinutes;
            return total + (Number.isFinite(estimate) ? estimate : 0);
        }, 0);
    }

    addSection(name = "New Section") {
        const sections = this.getSections();
        const order = sections.length
            ? sections.at(-1).order + ORDER_STEP
            : ORDER_STEP;

        const section = {
            id: createId("section"),
            name,
            order,
        };

        this.state.sections.push(section);
        this.save();
        return section.id;
    }

    renameSection(sectionId, name) {
        const section = this.state.sections.find((item) => item.id === sectionId);
        const cleaned = name.trim();

        if (!section || !cleaned) {
            return;
        }

        section.name = cleaned;
        this.save();
    }

    deleteSection(sectionId) {
        this.state.sections = this.state.sections.filter(
            (section) => section.id !== sectionId,
        );
        this.state.tasks = this.state.tasks.filter(
            (task) => task.sectionId !== sectionId,
        );
        this.normalize();
        this.save();
    }

    addTasks(sectionId, taskInputs) {
        const created = [];

        for (const input of taskInputs) {
            const task = {
                id: createId("task"),
                sectionId,
                text: input.text,
                order: 0,
            };

            this.insertTaskByPriority(task);
            created.push(task);
        }

        this.normalizeTasks(sectionId);
        this.save();
        return created;
    }

    insertTaskByPriority(task) {
        const sectionTasks = this.getTasks(task.sectionId);
        let insertIndex = sectionTasks.findIndex(
            (existing) => initialPlacementCompare(task, existing) < 0,
        );

        if (insertIndex < 0) {
            insertIndex = sectionTasks.length;
        }

        sectionTasks.splice(insertIndex, 0, task);

        for (const [index, item] of sectionTasks.entries()) {
            item.order = (index + 1) * ORDER_STEP;
        }

        this.state.tasks.push(task);
    }

    updateTaskText(taskId, text) {
        const task = this.getTask(taskId);
        const cleaned = text.trim();

        if (!task || !cleaned) {
            return;
        }

        // The complete editable line is the source of truth.
        task.text = cleaned;
        this.save();
    }

    completeTask(taskId) {
        const task = this.getTask(taskId);
        if (!task) {
            return null;
        }

        const snapshot = structuredClone(task);
        this.state.tasks = this.state.tasks.filter((item) => item.id !== taskId);
        this.normalizeTasks(task.sectionId);
        this.save();
        return snapshot;
    }

    restoreTask(task) {
        if (!task || this.getTask(task.id)) {
            return;
        }

        const sectionExists = this.state.sections.some(
            (section) => section.id === task.sectionId,
        );
        if (!sectionExists) {
            return;
        }

        const restored = structuredClone(task);
        const sectionTasks = this.getTasks(restored.sectionId);
        const insertIndex = Math.max(
            0,
            Math.min(
                sectionTasks.length,
                Math.round(restored.order / ORDER_STEP) - 1,
            ),
        );

        sectionTasks.splice(insertIndex, 0, restored);
        for (const [index, item] of sectionTasks.entries()) {
            item.order = (index + 1) * ORDER_STEP;
        }

        this.state.tasks.push(restored);
        this.save();
    }

    sortSectionByPriority(sectionId) {
        const tasks = this.getTasks(sectionId).map((task, index) => ({
            task,
            index,
            parsed: parseTaskLine(task.text),
        }));

        tasks.sort((left, right) => {
            const leftRank = PRIORITY_RANK[left.parsed?.priority] ?? 99;
            const rightRank = PRIORITY_RANK[right.parsed?.priority] ?? 99;

            if (leftRank !== rightRank) {
                return leftRank - rightRank;
            }

            const leftNumbered = Number.isInteger(left.parsed?.priorityNumber);
            const rightNumbered = Number.isInteger(right.parsed?.priorityNumber);

            if (leftNumbered && rightNumbered) {
                const numberDifference = left.parsed.priorityNumber
                    - right.parsed.priorityNumber;
                if (numberDifference !== 0) {
                    return numberDifference;
                }
            } else if (leftNumbered !== rightNumbered) {
                return leftNumbered ? -1 : 1;
            }

            // Stable manual order for unnumbered priorities and ties.
            return left.index - right.index;
        });

        for (const [index, entry] of tasks.entries()) {
            entry.task.order = (index + 1) * ORDER_STEP;
        }

        this.save();
    }

    reorderSections(sectionIds) {
        for (const [index, sectionId] of sectionIds.entries()) {
            const section = this.state.sections.find((item) => item.id === sectionId);
            if (section) {
                section.order = (index + 1) * ORDER_STEP;
            }
        }

        this.save();
    }

    reorderTasks(sectionOrders) {
        for (const [sectionId, taskIds] of Object.entries(sectionOrders)) {
            for (const [index, taskId] of taskIds.entries()) {
                const task = this.getTask(taskId);
                if (task) {
                    task.sectionId = sectionId;
                    task.order = (index + 1) * ORDER_STEP;
                }
            }
        }

        this.save();
    }

    normalize() {
        const sections = this.getSections();
        for (const [index, section] of sections.entries()) {
            section.order = (index + 1) * ORDER_STEP;
            this.normalizeTasks(section.id);
        }

        const validSectionIds = new Set(sections.map((section) => section.id));
        this.state.tasks = this.state.tasks.filter(
            (task) => validSectionIds.has(task.sectionId),
        );
    }

    normalizeTasks(sectionId) {
        const tasks = this.getTasks(sectionId);
        for (const [index, task] of tasks.entries()) {
            task.order = (index + 1) * ORDER_STEP;
        }
    }
}
