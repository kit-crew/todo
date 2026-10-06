# Todo

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-663399?logo=css&logoColor=white)
![Vanilla JavaScript](https://img.shields.io/badge/Vanilla_JavaScript-F7DF1E?logo=javascript&logoColor=000000)
![No Framework](https://img.shields.io/badge/framework-none-2E7D32)
![No Build Step](https://img.shields.io/badge/build_step-none-2E7D32)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

> A simple "do it" app.
> Write it down, do it, cross it off.

## Published for Free with GitHub Pages

The project uses **Pages** to publish from the `main` branch root.

- App: https://kit-crew.github.io/todo/
- Repository: https://github.com/kit-crew/todo

## Features

Built with **HTML, CSS, and vanilla JavaScript**.

**Todo is not a task manager.**
It focuses on getting one-time tasks
into a list,
and getting them done.

Features include:

- User-defined sections to organize multiple lists.
- Drag sections to reorder them.
- Drag tasks within or between sections.
- Add one task or paste many tasks (one per line).
- Optional `A-`, `B-`, `C-`, `D-` priority prefixes.
- Optional numbered priorities such as `A1-`, `A2-`, and `B1-`.
- Optional `!` emphasis, including `A1!- Task text`.
- Optional trailing time estimate such as `(20)` for 20 minutes.
- The task line is preserved and editable.
- Priority, emphasis, numbering, and estimates are parsed from task text.
- Checking a task deletes it; a brief Undo is available.
- Task data is stored only in browser `localStorage` and is not synchronized to a server.
- Responsive layout: stacked on mobile, section columns on bigger screens.
- Installable PWA.
- Hosted for free on GitHub Pages.

## Example

Draft a list of tasks such as the following.
Copy and paste the list and click + to add the tasks.

```text
A1!- Finish grading (60)
A2- Start research project (60)
B- Clean out refrig (20)
C- Sweep the garage (15)
! Start laundry (5)
Plain unprioritized task
```

Paste, then press Enter or click the `+` button.

Use **Shift+Enter** to enter a newline manually.

## Optional: Sort Tasks by Priority

Manual ordering is stored with the tasks.

Click the `A1` button in a section to sort its tasks by priority:

- A, then B, then C, then D.
- Numbered priorities come first within their letter and use natural numeric order (`A9` before `A10`).
- Unnumbered tasks within the same priority keep their existing manual order.
- Unprioritized tasks keep their existing manual order after the prioritized tasks.

## Optional: Click for Task Roulette

Click `Random` to select a task without moving it.
All tasks are eligible, with modest weighting toward higher priority, emphasis, and shorter estimates.

Click `Quick Win` to offer tasks from shortest to longest.
Tasks with the same estimate are offered in random order.

A selected task is highlighted and becomes the timer target.
Click a selected task to unselect it.

## Optional: Integrated Timer

Tasks can have a trailing time estimate in minutes in parentheses.
These are aggregated at the top of each section and in the page header.

- With no selected task, the header shows the sum of all task estimates, e.g. `(385)`.
- With a selected task, the header shows the selected task estimate, e.g. `(60)`.

Click `Timer` to start the timer.

- Whole minutes are displayed: `(5)`, `(4)`, ..., `(0)`, `(+1)`, `(+2)`.
- `Pause` and `resume` are available when the timer is active.
- Click the timer `+` to add one minute to the current timer.

## Data

The **text** of each task provides all task data.
Edit the text to update the associated optional priority and time estimate.

## Storage

The service worker caches app files for offline use.
Change `CACHE_NAME` in `sw.js` after changing app files.

## Run Locally

Any static web server works, including VS Code Live Server:

1. Fork the project into your account.
2. Clone your version down to your machine.
3. Open the project in VS Code.
4. Right-click index.html / **Open with Live Server**.

## Changelog

[CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE)
