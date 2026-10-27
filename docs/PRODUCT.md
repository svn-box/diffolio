> Tauri port: this document preserves the original product/design baseline. Runtime changes and migration status are tracked in [MIGRATION.md](MIGRATION.md).

# Diffolio

<!-- impeccable:product-schema 1 -->

## Platform

web

The interface runs locally in Electron on macOS; it follows macOS desktop conventions.

## Stack

Electron, React and TypeScript, following SVNBox's electron-vite architecture and formatting conventions. CodeMirror provides text editing and comparison primitives. This direction is recorded in [PLAN.md](PLAN.md) and the user requested building from that plan with SVNBox as the engineering reference.

## Users

Kelvin, for personal use on macOS, comparing local files and folders.

## Product Purpose

Open two versions, understand their differences, and save a deliberately edited result without silently modifying the inputs.

## Operating Context

Local files, clipboard text and comparison sessions. The user selected a personal macOS application and asked to start building in this folder.

## Capabilities and Constraints

The first usable release covers real text comparisons, editable result copies, undo and safe saving. Folder, image and Git workflows follow the stages in [PLAN.md](PLAN.md). The application should stay responsive and give useful errors. All data stays local.

## Brand Commitments

Name: Diffolio. The user explicitly requested Kaleidoscope's excellent design and color approach as the visual reference, and SVNBox as the engineering reference. Use original Diffolio assets and an open icon library.

## Evidence on Hand

The product plan and design system in docs/, implemented application code, original Diffolio captures in resources/screenshots/, and reusable inputs in fixtures/reference. Examples and screenshots are not measurements of Diffolio performance.
