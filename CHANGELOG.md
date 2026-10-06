# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**
and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

---

## [0.1.0] - 2026-10-06

### Added

- Added section-based todo lists with user-defined names and manual drag-and-drop ordering.
- Added fast single-task and multiline task entry.
- Added optional priority prefixes `A-` through `D-`.
- Added numbered priorities such as `A1-`, `A2-`, and `A10-`.
- Added optional `!` emphasis marker for tasks needing additional attention.
- Added optional trailing minute estimates such as `(20)`.
- Added calculated total estimated minutes for the full todo list.
- Added calculated estimated minutes beside each section name.
- Added a minute-only focus timer for the selected task.
- Added pause, resume, and one-minute timer extension controls.
- Added task selection with a distinct highlighted state.
- Added `Random` task selection weighted toward higher-priority, emphasized, and shorter tasks.
- Added `Quick Win` selection that offers tasks in ascending estimated-time order and randomizes tasks having equal estimates.
- Added repeated `Random` and `Quick Win` selection for choosing another task without changing task order.
- Added optional priority sorting within each section.
  - Numbered priorities sort naturally, so `A9` precedes `A10`.
  - Numbered tasks precede unnumbered tasks within the same priority.
  - Unnumbered tasks retain their existing manual relative order.
- Added completion with brief Undo support.
- Added local browser persistence with no account or server synchronization.
- Added installable PWA support and offline application assets.
- Added responsive layouts for desktop and mobile use.
- Added customizable priority-border colors in `styles-borders.css`.

---

## Notes on versioning and releases

- We use **SemVer**:
  - **MAJOR** - breaking changes
  - **MINOR** - backward-compatible additions
  - **PATCH** - fixes, documentation, tooling
- Versions are driven by git tags. Tag `vX.Y.Z` to release.

## Release Procedure (Required)

Follow these steps exactly when creating a new release.

### Task 1. Update release metadata (manual edits)

1.1. CHANGELOG.md: add section, move unreleased entries, update links

### Task 2. Set up and Validate

Open the project in VS Code.
Right-click index.html / **Open with Live Server**.

Review all generated and modified files before committing.

### Task 3. Commit and Push

```shell
git add -A
git commit -m "Prep X.Y.Z"
git push -u origin main
```

Verify that all required GitHub Actions complete successfully.

### Task 4. Tag and Push

After the required GitHub Actions succeed:

```shell
git tag vX.Y.Z -m "X.Y.Z"
git push origin vX.Y.Z
```

Create GitHub Release after pushing tag, for example with a command like this:

```shell
gh release create v0.1.0 --verify-tag --title "0.1.0"  --generate-notes
```

## Only As Needed (delete a tag)

```shell
git tag -d vX.Z.Y
git push origin :refs/tags/vX.Z.Y
```

## Links

[Unreleased]: https://github.com/kit-crew/todo/v0.1.0...HEAD
[0.1.0]: https://github.com/kit-crew/todo/releases/tag/v0.1.0

<!-- markdownlint-enable MD024 -->