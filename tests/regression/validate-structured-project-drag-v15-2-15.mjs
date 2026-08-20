import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const interaction = read("assets/js/interaction-patterns.js");
const agenda = read("assets/js/projects-calendar-v13.0.20.js");
const agendaCss = read("assets/css/projects-calendar-v13.0.20.css");
const version = JSON.parse(read("version.json"));

assert.equal(version.version, "15.2.16");
assert.equal(version.schemaVersion, 12, "Finance Schema must remain 12");
assert.equal(version.cloudSchemaVersion, 3, "Cloud Schema must remain V3");

assert.match(index, /id="completedProjectsCard"[^>]+data-structured-drop-kind="project"[^>]+data-structured-drop-destination="completed"/);
assert.match(index, /data-structured-card="project"/);
assert.match(index, /data-structured-drag-handle/);
assert.match(index, /completeProjectByDrop/);
assert.match(index, /Project value and payment history will not change/);
assert.match(index, /id="structuredDragToast"[^>]+aria-live="polite"/);
assert.match(index, /id="structuredDragAnnouncer"[^>]+role="status"/);

assert.match(agenda, /data-structured-card="agenda"/);
assert.match(agenda, /data-structured-drop-destination="upcoming"/);
assert.match(agenda, /data-structured-drop-destination="completed"/);
assert.match(agenda, /moveAgendaEventByDrop/);
assert.match(agenda, /FinanceProjectDropActions\.completeLinkedAgenda/);
assert.match(agenda, /drop-undone/);

assert.match(interaction, /setupStructuredDragTransitions/);
assert.match(interaction, /pointerType === "mouse"/);
assert.match(interaction, /\[" ", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"\]/);
assert.match(interaction, /scheduleUndoDismiss\(5000\)/);
assert.match(interaction, /mouseenter.*pauseUndoDismiss/s);
assert.match(interaction, /focusin.*pauseUndoDismiss/s);
assert.match(agendaCss, /\.is-structured-drop-available/);
assert.match(agendaCss, /\.is-structured-drop-target/);
assert.match(agendaCss, /@media \(prefers-reduced-motion:reduce\)/);
assert.match(agendaCss, /\.structured-drag-handle \{ width:44px; min-width:44px; height:44px; \}/);

console.log("V15.2.16 structured Project Agenda and Active-to-Completed drag source contract passed.");
