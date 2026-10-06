import { parseTaskLine, parseTaskLines } from "./parser.js";
import { FocusTimer } from "./timer.js";

const COMPLETE_ANIMATION_MS = 140;
const UNDO_DURATION_MS = 6000;
const PRIORITY_WEIGHT = Object.freeze({
  A: 4,
  B: 3,
  C: 2,
  D: 1.5,
});

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function shuffled(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export class TodoUI {
  constructor(store) {
    this.store = store;
    this.focusTimer = new FocusTimer();

    this.sectionList = document.querySelector("#section-list");
    this.addSectionButton = document.querySelector("#add-section-button");
    this.randomButton = document.querySelector("#random-button");
    this.quickWinButton = document.querySelector("#quick-win-button");
    this.timerDisplay = document.querySelector("#timer-display");
    this.timerButton = document.querySelector("#timer-button");
    this.timerAddMinuteButton = document.querySelector(
      "#timer-add-minute-button",
    );
    this.undoToast = document.querySelector("#undo-toast");
    this.undoButton = document.querySelector("#undo-button");

    this.sectionSortable = null;
    this.taskSortables = [];
    this.undoTimer = null;
    this.undoTask = null;
    this.clockInterval = null;
    this.quickWinQueue = [];
    this.quickWinSignature = "";
  }

  init() {
    this.addSectionButton.addEventListener("click", () => this.addSection());
    this.randomButton.addEventListener("click", () => this.selectRandomTask());
    this.quickWinButton.addEventListener("click", () => this.selectQuickWin());
    this.timerButton.addEventListener("click", () => this.toggleTimer());
    this.timerAddMinuteButton.addEventListener("click", () =>
      this.addTimerMinute(),
    );
    this.undoButton.addEventListener("click", () => this.undoCompletion());

    this.render();
    this.clockInterval = window.setInterval(
      () => this.updateTimerHeader(),
      1000,
    );
  }

  render() {
    this.destroySortables();
    this.sectionList.replaceChildren();

    for (const section of this.store.getSections()) {
      this.sectionList.appendChild(this.buildSection(section));
    }

    this.ensureSelectedTaskExists();
    this.updateSelectionVisuals();
    this.updateTimerHeader();
    this.initSortables();
  }

  buildSection(section) {
    const article = createElement("section", "todo-section");
    article.dataset.sectionId = section.id;
    const sectionTasks = this.store.getTasks(section.id);

    const sectionMinutes = sectionTasks.reduce((total, task) => {
      const minutes = parseTaskLine(task.text)?.estimateMinutes;
      return total + (Number.isFinite(minutes) ? minutes : 0);
    }, 0);

    const header = createElement("header", "section-header");

    const titleGroup = createElement("div", "section-title-group");

    const title = createElement("span", "section-title", section.name);
    const minutes = createElement(
      "span",
      "section-minutes",
      `(${sectionMinutes})`,
    );

    titleGroup.append(title, minutes);
    title.tabIndex = 0;
    title.title = "Click to rename";
    title.addEventListener("click", () =>
      this.editSectionTitle(title, section.id),
    );
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && title.contentEditable !== "true") {
        event.preventDefault();
        this.editSectionTitle(title, section.id);
      }
    });

    const sortButton = createElement(
      "button",
      "icon-button section-priority-sort",
      "A1",
    );
    sortButton.type = "button";
    sortButton.title = "Sort this section by priority";
    sortButton.setAttribute("aria-label", `Sort ${section.name} by priority`);
    sortButton.addEventListener("click", () => {
      this.store.sortSectionByPriority(section.id);
      this.render();
    });

    const dragHandle = createElement(
      "button",
      "icon-button section-drag-handle",
      "⠿",
    );
    dragHandle.type = "button";
    dragHandle.title = "Drag section";
    dragHandle.setAttribute("aria-label", `Drag ${section.name} section`);

    const deleteButton = createElement(
      "button",
      "icon-button section-delete",
      "×",
    );
    deleteButton.type = "button";
    deleteButton.title = "Delete section";
    deleteButton.setAttribute("aria-label", `Delete ${section.name} section`);
    deleteButton.addEventListener("click", () => this.deleteSection(section));

    header.append(titleGroup, sortButton, dragHandle, deleteButton);

    const list = createElement("ul", "todo-list");
    list.dataset.sectionId = section.id;
    list.setAttribute("aria-label", `${section.name} tasks`);

    for (const task of sectionTasks) {
      list.appendChild(this.buildTask(task));
    }

    const entry = createElement("form", "task-entry");
    const textarea = createElement("textarea");
    textarea.rows = 1;
    textarea.placeholder = "Add task(s)…";
    textarea.setAttribute("aria-label", `Add tasks to ${section.name}`);
    textarea.title =
      "Optional: A- through D-, numbered priorities such as A1-, ! emphasis, and trailing minutes such as (20).";
    textarea.addEventListener("input", () => this.autoSize(textarea));
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        this.addTasksFromEntry(section.id, textarea);
      }
    });

    const addButton = createElement("button", "add-task-button", "+");
    addButton.type = "submit";
    addButton.title = "Add task(s)";
    addButton.setAttribute("aria-label", `Add tasks to ${section.name}`);

    entry.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addTasksFromEntry(section.id, textarea);
    });

    entry.append(textarea, addButton);
    article.append(header, list, entry);

    return article;
  }

  buildTask(task) {
    const item = createElement("li", "todo-item");
    item.dataset.taskId = task.id;

    const parsed = parseTaskLine(task.text);
    if (parsed?.priority) {
      item.classList.add(`priority-${parsed.priority.toLowerCase()}`);
    }
    if (parsed?.emphasized) {
      item.classList.add("is-emphasized");
    }

    item.addEventListener("click", (event) => {
      if (event.target.closest(".todo-check, .task-text, .task-drag-handle")) {
        return;
      }

      this.toggleTaskSelection(task.id);
    });

    const checkbox = createElement("input", "todo-check");
    checkbox.type = "checkbox";
    checkbox.title = "Done";
    checkbox.setAttribute("aria-label", `Complete ${task.text}`);
    checkbox.addEventListener("change", () => this.completeTask(item, task.id));

    const text = createElement("span", "task-text");
    this.renderTaskText(text, task.text);
    text.tabIndex = 0;
    text.title = "Click to edit";
    text.addEventListener("click", (event) => {
      event.stopPropagation();
      this.selectTask(task.id);
      this.editTaskText(text, task.id);
    });
    text.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && text.contentEditable !== "true") {
        event.preventDefault();
        this.selectTask(task.id);
        this.editTaskText(text, task.id);
      }
    });

    const dragHandle = createElement(
      "button",
      "icon-button task-drag-handle",
      "⠿",
    );
    dragHandle.type = "button";
    dragHandle.title = "Drag task";
    dragHandle.setAttribute("aria-label", `Drag ${task.text}`);

    item.append(checkbox, text, dragHandle);
    return item;
  }

  renderTaskText(element, taskText) {
    const parsed = parseTaskLine(taskText);
    element.replaceChildren();

    if (!parsed?.prefix) {
      element.textContent = taskText;
      return;
    }

    let remainingPrefix = parsed.prefix;
    const priorityTokenMatch = remainingPrefix.match(/^([A-D]\d*)/i);

    if (priorityTokenMatch) {
      element.appendChild(
        createElement("span", "task-priority-token", priorityTokenMatch[1]),
      );
      remainingPrefix = remainingPrefix.slice(priorityTokenMatch[1].length);
    }

    for (const character of remainingPrefix) {
      if (character === "!") {
        element.appendChild(
          createElement("span", "task-emphasis-token", character),
        );
      } else {
        element.appendChild(document.createTextNode(character));
      }
    }

    element.appendChild(document.createTextNode(parsed.body));
  }
  toggleTaskSelection(taskId) {
    if (this.focusTimer.selectedTaskId === taskId) {
      this.focusTimer.clearSelection();
      this.updateSelectionVisuals();
      this.updateTimerHeader();
      return;
    }

    this.selectTask(taskId);
  }
  selectTask(taskId) {
    this.focusTimer.selectTask(taskId);
    this.updateSelectionVisuals();
    this.updateTimerHeader();
  }

  updateSelectionVisuals() {
    const selectedTaskId = this.focusTimer.selectedTaskId;

    for (const item of this.sectionList.querySelectorAll(".todo-item")) {
      item.classList.toggle(
        "is-selected",
        item.dataset.taskId === selectedTaskId,
      );
    }
  }

  ensureSelectedTaskExists() {
    const selectedTaskId = this.focusTimer.selectedTaskId;
    if (selectedTaskId && !this.store.getTask(selectedTaskId)) {
      this.focusTimer.clearSelection();
    }
  }

  selectedTask() {
    this.ensureSelectedTaskExists();
    return this.focusTimer.selectedTaskId
      ? this.store.getTask(this.focusTimer.selectedTaskId)
      : null;
  }

  updateTimerHeader() {
    const task = this.selectedTask();

    if (!task) {
      this.timerDisplay.textContent = `(${this.store.getTotalEstimatedMinutes()})`;
      this.timerAddMinuteButton.hidden = true;
      this.timerButton.textContent = "Timer";
      this.timerButton.title = "Select a task with a time estimate";
      this.timerButton.setAttribute(
        "aria-label",
        "Select a task with a time estimate",
      );
      this.timerButton.disabled = true;
      return;
    }

    const estimate = parseTaskLine(task.text)?.estimateMinutes;
    const hasEstimate = Number.isFinite(estimate);
    const active = ["running", "paused"].includes(this.focusTimer.status);

    this.timerDisplay.textContent = this.focusTimer.displayValue(estimate);
    this.timerAddMinuteButton.hidden = !(active && hasEstimate);
    this.timerButton.disabled = !hasEstimate;

    if (!active) {
      this.timerButton.textContent = "Timer";
      this.timerButton.title = hasEstimate
        ? "Start timer"
        : "Add a trailing estimate such as (20)";
      this.timerButton.setAttribute(
        "aria-label",
        hasEstimate ? "Start timer" : "Task has no time estimate",
      );
      return;
    }

    if (this.focusTimer.status === "running") {
      this.timerButton.textContent = "⏸";
      this.timerButton.title = "Pause timer";
      this.timerButton.setAttribute("aria-label", "Pause timer");
    } else {
      this.timerButton.textContent = "▶";
      this.timerButton.title = "Resume timer";
      this.timerButton.setAttribute("aria-label", "Resume timer");
    }
  }

  toggleTimer() {
    const task = this.selectedTask();
    const estimate = task ? parseTaskLine(task.text)?.estimateMinutes : null;

    if (!task || !Number.isFinite(estimate)) {
      return;
    }

    if (this.focusTimer.status === "running") {
      this.focusTimer.pause();
    } else if (this.focusTimer.status === "paused") {
      this.focusTimer.resume();
    } else {
      this.focusTimer.start();
    }

    this.updateTimerHeader();
  }

  addTimerMinute() {
    this.focusTimer.addMinute();
    this.updateTimerHeader();
  }

  selectRandomTask() {
    let tasks = this.store.getAllTasks();

    if (!tasks.length) {
      return;
    }

    const selectedTaskId = this.focusTimer.selectedTaskId;

    if (tasks.length > 1 && selectedTaskId) {
      tasks = tasks.filter((task) => task.id !== selectedTaskId);
    }

    const weighted = tasks.map((task) => {
      const parsed = parseTaskLine(task.text);
      let weight = PRIORITY_WEIGHT[parsed?.priority] ?? 1;

      if (parsed?.emphasized) {
        weight *= 1.5;
      }

      const estimate = parsed?.estimateMinutes;
      if (Number.isFinite(estimate)) {
        if (estimate <= 15) {
          weight *= 2;
        } else if (estimate <= 30) {
          weight *= 1.5;
        } else if (estimate <= 60) {
          weight *= 1.25;
        }
      }

      return { task, weight };
    });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let pick = Math.random() * totalWeight;
    let selected = weighted.at(-1).task;

    for (const item of weighted) {
      pick -= item.weight;
      if (pick <= 0) {
        selected = item.task;
        break;
      }
    }

    this.selectAndReveal(selected.id);
  }

  selectQuickWin() {
    const estimated = this.store
      .getAllTasks()
      .map((task) => ({
        task,
        estimate: parseTaskLine(task.text)?.estimateMinutes,
      }))
      .filter((item) => Number.isFinite(item.estimate));

    if (!estimated.length) {
      return;
    }

    const signature = estimated
      .map((item) => `${item.task.id}:${item.estimate}`)
      .sort()
      .join("|");

    if (
      signature !== this.quickWinSignature ||
      this.quickWinQueue.length === 0
    ) {
      const byEstimate = new Map();

      for (const item of estimated) {
        if (!byEstimate.has(item.estimate)) {
          byEstimate.set(item.estimate, []);
        }

        byEstimate.get(item.estimate).push(item.task.id);
      }

      this.quickWinQueue = [...byEstimate.keys()]
        .sort((a, b) => a - b)
        .flatMap((estimate) => shuffled(byEstimate.get(estimate)));

      this.quickWinSignature = signature;
    }

    const taskId = this.quickWinQueue.shift();

    if (taskId) {
      this.selectAndReveal(taskId);
    }
  }

  selectAndReveal(taskId) {
    this.selectTask(taskId);
    const item = this.sectionList.querySelector(
      `[data-task-id="${CSS.escape(taskId)}"]`,
    );
    item?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  addSection() {
    const sectionId = this.store.addSection();
    this.render();

    requestAnimationFrame(() => {
      const title = this.sectionList.querySelector(
        `[data-section-id="${CSS.escape(sectionId)}"] .section-title`,
      );
      if (title) {
        this.editSectionTitle(title, sectionId);
      }
    });
  }

  deleteSection(section) {
    const count = this.store.getTasks(section.id).length;

    if (count > 0) {
      const okay = window.confirm(
        `Delete "${section.name}" and its ${count} task${count === 1 ? "" : "s"}?`,
      );
      if (!okay) {
        return;
      }
    }

    this.store.deleteSection(section.id);
    this.render();
  }

  addTasksFromEntry(sectionId, textarea) {
    const parsed = parseTaskLines(textarea.value);
    if (!parsed.length) {
      textarea.focus();
      return;
    }

    this.store.addTasks(sectionId, parsed);
    textarea.value = "";
    this.autoSize(textarea);
    this.render();

    requestAnimationFrame(() => {
      const nextTextarea = this.sectionList.querySelector(
        `[data-section-id="${CSS.escape(sectionId)}"] .task-entry textarea`,
      );
      nextTextarea?.focus();
    });
  }

  completeTask(item, taskId) {
    item.classList.add("is-completing");

    window.setTimeout(() => {
      const snapshot = this.store.completeTask(taskId);
      if (snapshot) {
        this.showUndo(snapshot);
      }
      this.render();
    }, COMPLETE_ANIMATION_MS);
  }

  showUndo(task) {
    this.undoTask = task;
    this.undoToast.hidden = false;

    window.clearTimeout(this.undoTimer);
    this.undoTimer = window.setTimeout(() => {
      this.hideUndo();
    }, UNDO_DURATION_MS);
  }

  undoCompletion() {
    if (this.undoTask) {
      this.store.restoreTask(this.undoTask);
      this.render();
    }
    this.hideUndo();
  }

  hideUndo() {
    window.clearTimeout(this.undoTimer);
    this.undoTimer = null;
    this.undoTask = null;
    this.undoToast.hidden = true;
  }

  editSectionTitle(element, sectionId) {
    this.beginInlineEdit(element, (value) => {
      this.store.renameSection(sectionId, value);
    });
  }

  editTaskText(element, taskId) {
    const task = this.store.getTask(taskId);
    if (!task) {
      return;
    }

    // Edit the exact complete task line, including priority and estimate.
    element.textContent = task.text;
    this.beginInlineEdit(element, (value) => {
      this.store.updateTaskText(taskId, value);
    });
  }

  beginInlineEdit(element, save) {
    if (element.contentEditable === "true") {
      return;
    }

    const original = element.textContent;
    let finished = false;

    const finish = (shouldSave) => {
      if (finished) {
        return;
      }
      finished = true;

      const value = element.textContent.trim();
      element.contentEditable = "false";

      if (shouldSave && value) {
        save(value);
      } else {
        element.textContent = original;
      }

      this.render();
    };

    element.contentEditable = "true";
    element.focus();
    placeCaretAtEnd(element);

    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });

    element.addEventListener("blur", () => finish(true), { once: true });
  }

  autoSize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  initSortables() {
    if (!window.Sortable) {
      return;
    }

    this.sectionSortable = new window.Sortable(this.sectionList, {
      animation: 150,
      handle: ".section-drag-handle",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: () => this.saveSectionOrder(),
    });

    for (const list of this.sectionList.querySelectorAll(".todo-list")) {
      const sortable = new window.Sortable(list, {
        group: "todo-tasks",
        animation: 150,
        handle: ".task-drag-handle",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        emptyInsertThreshold: 24,
        onEnd: () => this.saveTaskOrder(),
      });

      this.taskSortables.push(sortable);
    }
  }

  saveSectionOrder() {
    const ids = [...this.sectionList.querySelectorAll(".todo-section")].map(
      (section) => section.dataset.sectionId,
    );

    this.store.reorderSections(ids);
  }

  saveTaskOrder() {
    const sectionOrders = {};

    for (const list of this.sectionList.querySelectorAll(".todo-list")) {
      sectionOrders[list.dataset.sectionId] = [
        ...list.querySelectorAll(".todo-item"),
      ].map((item) => item.dataset.taskId);
    }

    this.store.reorderTasks(sectionOrders);
  }

  destroySortables() {
    this.sectionSortable?.destroy();
    this.sectionSortable = null;

    for (const sortable of this.taskSortables) {
      sortable.destroy();
    }
    this.taskSortables = [];
  }
}
