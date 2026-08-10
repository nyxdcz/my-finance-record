"use strict";

/* My Finance Records V13.0.20 · Projects Calendar
   Adds meeting, presentation, site-visit, deadline, and other project events.
   Events are stored separately from finance records so calendar changes never
   alter account balances, expenses, payments, or project financial values. */
(() => {
  const EVENTS_KEY = "simple-finance-project-calendar-v13.0.20";
  const VERSION = "13.0.20";
  const EVENT_TYPES = [
    ["meeting", "Meeting"],
    ["presentation", "Presentation"],
    ["site-visit", "Site visit"],
    ["deadline", "Deadline"],
    ["other", "Other"]
  ];
  const REMINDERS = [
    ["none", "No reminder"],
    ["PT0M", "At event time"],
    ["PT15M", "15 minutes before"],
    ["PT1H", "1 hour before"],
    ["P1D", "1 day before"],
    ["P3D", "3 days before"],
    ["P1W", "1 week before"]
  ];

  let events = [];
  let viewDate = new Date();
  let editingId = "";

  const pad = value => String(value).padStart(2, "0");
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const monthKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
  const uid = () => `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  function safeRead() {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === "object") : [];
    } catch (error) {
      return [];
    }
  }

  window.getProjectCalendarEvents = () => (events && events.length) ? events : safeRead();

  function safeWrite(next) {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
      return true;
    } catch (error) {
      showCalendarMessage("Calendar storage is full. Export your calendar and remove old events.", "error");
      return false;
    }
  }

  function projectRecords() {
    try {
      return Array.isArray(data?.projects) ? data.projects : [];
    } catch (error) {
      return [];
    }
  }

  function projectOptions(selected = "") {
    return `<option value="">No project</option>` + projectRecords()
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      .map(project => `<option value="${escapeHtml(project.id)}" ${project.id === selected ? "selected" : ""}>${escapeHtml(project.name || "Unnamed project")}</option>`)
      .join("");
  }

  function projectName(id) {
    return projectRecords().find(project => project.id === id)?.name || "General";
  }

  function typeLabel(type) {
    return EVENT_TYPES.find(([value]) => value === type)?.[1] || "Other";
  }

  function reminderLabel(value) {
    return REMINDERS.find(([key]) => key === value)?.[1] || "No reminder";
  }

  function monthLabel(value) {
    const [year, month] = String(value).split("-").map(Number);
    if (!year || !month) return "Calendar";
    return new Intl.DateTimeFormat("en-PH", { month:"long", year:"numeric" }).format(new Date(year, month - 1, 1));
  }

  function formatEventDate(event) {
    const date = new Date(`${event.date}T00:00:00`);
    const dateText = Number.isNaN(date.getTime()) ? event.date : new Intl.DateTimeFormat("en-PH", { month:"short", day:"numeric", year:"numeric" }).format(date);
    if (!event.startTime) return dateText;
    return `${dateText} · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}`;
  }

  function sortedEvents(list = events) {
    return [...list].sort((a, b) =>
      String(a.date || "").localeCompare(String(b.date || "")) ||
      String(a.startTime || "99:99").localeCompare(String(b.startTime || "99:99")) ||
      String(a.title || "").localeCompare(String(b.title || ""))
    );
  }

  function eventsForMonth(month) {
    return sortedEvents(events.filter(event => String(event.date || "").startsWith(month)));
  }

  function currentMonthEvents() {
    return eventsForMonth(monthKey(viewDate));
  }

  function buildCalendarGrid(month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const last = new Date(year, monthNumber, 0);
    const startOffset = first.getDay();
    const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
    const today = dateKey(new Date());

    const cells = [];
    for (let index = 0; index < totalCells; index += 1) {
      const day = index - startOffset + 1;
      if (day < 1 || day > last.getDate()) {
        cells.push(`<div class="pc-calendar-day is-empty" aria-hidden="true"></div>`);
        continue;
      }
      const date = `${month}-${pad(day)}`;
      const dayEvents = events.filter(event => event.date === date);
      cells.push(`
        <button type="button" class="pc-calendar-day${date === today ? " is-today" : ""}${dayEvents.length ? " has-events" : ""}" data-pc-date="${date}" aria-label="${escapeHtml(date)} · ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}">
          <strong>${day}</strong>
          ${dayEvents.slice(0, 3).map(event => `<span class="pc-dot pc-type-${escapeHtml(event.type)}" title="${escapeHtml(event.title)}"></span>`).join("")}
          ${dayEvents.length > 3 ? `<small>+${dayEvents.length - 3}</small>` : ""}
        </button>`);
    }
    return cells.join("");
  }

  function render() {
    const root = document.getElementById("projectCalendarV13020");
    if (!root) return;
    const month = monthKey(viewDate);
    const monthEvents = eventsForMonth(month);
    root.querySelector("[data-pc-month-label]").textContent = monthLabel(month);
    root.querySelector("[data-pc-calendar-grid]").innerHTML = buildCalendarGrid(month);

    const list = root.querySelector("[data-pc-event-list]");
    list.innerHTML = monthEvents.length
      ? monthEvents.map(event => `
        <article class="pc-event-card pc-type-${escapeHtml(event.type)}">
          <div class="pc-event-main">
            <div class="pc-event-type">${escapeHtml(typeLabel(event.type))}</div>
            <h4>${escapeHtml(event.title)}</h4>
            <p>${escapeHtml(formatEventDate(event))}${event.projectId ? ` · ${escapeHtml(projectName(event.projectId))}` : ""}</p>
            ${event.location ? `<small>📍 ${escapeHtml(event.location)}</small>` : ""}
            ${event.attendees ? `<small>👥 ${escapeHtml(event.attendees)}</small>` : ""}
          </div>
          <div class="pc-event-actions">
            <button type="button" class="button button-secondary button-small" data-pc-edit="${escapeHtml(event.id)}">Edit</button>
            <button type="button" class="button button-secondary button-small" data-pc-delete="${escapeHtml(event.id)}">Delete</button>
            <button type="button" class="button button-secondary button-small" data-pc-ics="${escapeHtml(event.id)}">ICS</button>
          </div>
        </article>`).join("")
      : `<div class="pc-empty"><strong>No scheduled events</strong><span>Add a meeting, presentation, site visit, or project deadline.</span></div>`;

    root.querySelector("[data-pc-count]").textContent = `${monthEvents.length} event${monthEvents.length === 1 ? "" : "s"}`;
  }

  function showCalendarMessage(message, type = "info") {
    const node = document.querySelector("[data-pc-message]");
    if (!node) return;
    node.textContent = message;
    node.className = `pc-message ${type}`;
    clearTimeout(showCalendarMessage.timer);
    showCalendarMessage.timer = setTimeout(() => {
      node.textContent = "";
      node.className = "pc-message";
    }, 4200);
  }

  function openDialog(projectId = "", eventId = "") {
    const dialog = document.getElementById("projectCalendarEventDialog");
    if (!dialog) return;
    editingId = eventId;
    const event = eventId ? events.find(item => item.id === eventId) : null;
    document.getElementById("pcEventId").value = event?.id || "";
    document.getElementById("pcEventProject").innerHTML = projectOptions(event?.projectId || projectId);
    document.getElementById("pcEventType").value = event?.type || "meeting";
    document.getElementById("pcEventTitle").value = event?.title || "";
    document.getElementById("pcEventDate").value = event?.date || dateKey(viewDate);
    document.getElementById("pcEventStart").value = event?.startTime || "09:00";
    document.getElementById("pcEventEnd").value = event?.endTime || "10:00";
    document.getElementById("pcEventLocation").value = event?.location || "";
    document.getElementById("pcEventLink").value = event?.link || "";
    document.getElementById("pcEventAttendees").value = event?.attendees || "";
    document.getElementById("pcEventReminder").value = event?.reminder || "P1D";
    document.getElementById("pcEventNotes").value = event?.notes || "";
    document.getElementById("projectCalendarEventDialogTitle").textContent = event ? "Edit calendar event" : "Schedule project event";
    dialog.showModal();
  }

  function closeDialog() {
    document.getElementById("projectCalendarEventDialog")?.close();
    editingId = "";
  }

  function saveEvent(event) {
    event.preventDefault();
    const title = document.getElementById("pcEventTitle").value.trim();
    const date = document.getElementById("pcEventDate").value;
    if (!title || !date) {
      showCalendarMessage("Add an event title and date.", "warning");
      return;
    }
    const startTime = document.getElementById("pcEventStart").value;
    const endTime = document.getElementById("pcEventEnd").value;
    if (startTime && endTime && endTime <= startTime) {
      showCalendarMessage("End time must be after the start time.", "warning");
      return;
    }

    const id = document.getElementById("pcEventId").value || uid();
    const existing = events.find(item => item.id === id);
    const record = {
      id,
      projectId: document.getElementById("pcEventProject").value,
      type: document.getElementById("pcEventType").value,
      title,
      date,
      startTime,
      endTime,
      location: document.getElementById("pcEventLocation").value.trim().slice(0, 180),
      link: document.getElementById("pcEventLink").value.trim().slice(0, 500),
      attendees: document.getElementById("pcEventAttendees").value.trim().slice(0, 240),
      reminder: document.getElementById("pcEventReminder").value,
      notes: document.getElementById("pcEventNotes").value.trim().slice(0, 1000),
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    const next = existing ? events.map(item => item.id === id ? record : item) : [...events, record];
    if (!safeWrite(next)) return;
    events = next;
    viewDate = new Date(`${date}T00:00:00`);
    closeDialog();
    render();
    if (typeof window.renderDashboardCalendar === "function") window.renderDashboardCalendar();
    showCalendarMessage(existing ? "Calendar event updated." : "Calendar event scheduled.", "success");
  }

  function deleteEvent(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;
    if (!confirm(`Delete “${event.title}”?`)) return;
    const next = events.filter(item => item.id !== id);
    if (!safeWrite(next)) return;
    events = next;
    render();
    if (typeof window.renderDashboardCalendar === "function") window.renderDashboardCalendar();
    showCalendarMessage("Calendar event deleted.", "success");
  }

  function icsEscape(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function icsDateTime(date, time) {
    const clean = `${date}T${time || "00:00"}`;
    const value = new Date(clean);
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear(), m = pad(value.getMonth() + 1), d = pad(value.getDate());
    const h = pad(value.getHours()), min = pad(value.getMinutes());
    return `${y}${m}${d}T${h}${min}00`;
  }

  function downloadIcs(event) {
    const start = icsDateTime(event.date, event.startTime);
    const end = icsDateTime(event.date, event.endTime || event.startTime || "10:00");
    const description = [
      event.projectId ? `Project: ${projectName(event.projectId)}` : "",
      event.attendees ? `Attendees: ${event.attendees}` : "",
      event.location ? `Location: ${event.location}` : "",
      event.link ? `Meeting link: ${event.link}` : "",
      event.notes ? `Notes: ${event.notes}` : ""
    ].filter(Boolean).join("\n");
    const alarm = event.reminder === "none" ? [] : [
      "BEGIN:VALARM",
      `TRIGGER:-${event.reminder}`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(event.title)}`,
      "END:VALARM"
    ];
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Finance Records//Projects Calendar//EN",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@my-finance-records.local`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART;TZID=Asia/Manila:${start}`,
      `DTEND;TZID=Asia/Manila:${end}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      event.location ? `LOCATION:${icsEscape(event.location)}` : "",
      event.link ? `URL:${icsEscape(event.link)}` : "",
      ...alarm,
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean);
    const blob = new Blob([lines.join("\r\n") + "\r\n"], { type:"text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${String(event.title).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "calendar-event"}.ics`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildUi() {
    const projectsPage = document.getElementById("projects");
    const heading = projectsPage?.querySelector(".page-heading");
    if (!projectsPage || !heading || document.getElementById("projectCalendarV13020")) return;

    const card = document.createElement("article");
    card.className = "card project-calendar-v13020";
    card.id = "projectCalendarV13020";
    card.innerHTML = `
      <div class="card-header pc-header">
        <div>
          <h3>Projects Calendar</h3>
          <p>Schedule meetings, presentations, site visits, deadlines, and other project events.</p>
        </div>
        <div class="pc-header-actions">
          <span class="pc-count" data-pc-count>0 events</span>
          <button type="button" class="button button-primary button-small" data-pc-add>+ Schedule event</button>
        </div>
      </div>
      <div class="pc-toolbar">
        <button type="button" class="button button-secondary button-small" data-pc-prev aria-label="Previous month">‹</button>
        <strong data-pc-month-label>Month</strong>
        <button type="button" class="button button-secondary button-small" data-pc-next aria-label="Next month">›</button>
        <button type="button" class="button button-secondary button-small" data-pc-today>Today</button>
      </div>
      <div class="pc-layout">
        <div>
          <div class="pc-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
          <div class="pc-calendar-grid" data-pc-calendar-grid></div>
        </div>
        <div class="pc-agenda">
          <div class="pc-agenda-heading"><strong>Agenda</strong><small>Meetings and presentations for this month</small></div>
          <div data-pc-event-list></div>
        </div>
      </div>
      <p class="pc-message" data-pc-message aria-live="polite"></p>
    `;
    heading.insertAdjacentElement("afterend", card);

    const dialog = document.createElement("dialog");
    dialog.id = "projectCalendarEventDialog";
    dialog.className = "app-dialog dialog-form dialog-standard";
    dialog.innerHTML = `
      <form id="projectCalendarEventForm">
        <div class="modal-header"><h3 id="projectCalendarEventDialogTitle">Schedule project event</h3><button type="button" class="button button-secondary button-small" data-pc-close>Close</button></div>
        <div class="modal-body">
          <input type="hidden" id="pcEventId">
          <div class="dialog-context-note">This calendar is separate from project financial records.</div>
          <div class="form-grid two-column">
            <div class="field"><label for="pcEventProject">Project</label><select class="select" id="pcEventProject">${projectOptions()}</select></div>
            <div class="field"><label for="pcEventType">Event type</label><select class="select" id="pcEventType">${EVENT_TYPES.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></div>
            <div class="field field-full"><label for="pcEventTitle">Title <span class="required-mark">*</span></label><input class="input" id="pcEventTitle" maxlength="120" required placeholder="Example: Client presentation"></div>
            <div class="field"><label for="pcEventDate">Date <span class="required-mark">*</span></label><input class="input" id="pcEventDate" type="date" required></div>
            <div class="field"><label for="pcEventReminder">Reminder</label><select class="select" id="pcEventReminder">${REMINDERS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></div>
            <div class="field"><label for="pcEventStart">Start time</label><input class="input" id="pcEventStart" type="time"></div>
            <div class="field"><label for="pcEventEnd">End time</label><input class="input" id="pcEventEnd" type="time"></div>
            <div class="field field-full"><label for="pcEventLocation">Location</label><input class="input" id="pcEventLocation" maxlength="180" placeholder="Office, site, café, or online"></div>
            <div class="field field-full"><label for="pcEventLink">Meeting / presentation link</label><input class="input" id="pcEventLink" type="url" maxlength="500" placeholder="https://..."></div>
            <div class="field field-full"><label for="pcEventAttendees">Client / attendees</label><input class="input" id="pcEventAttendees" maxlength="240" placeholder="Client name, team, or attendees"></div>
            <div class="field field-full"><label for="pcEventNotes">Notes</label><textarea class="textarea" id="pcEventNotes" rows="3" maxlength="1000" placeholder="Agenda, presentation notes, site instructions, or reminders"></textarea></div>
          </div>
        </div>
        <div class="modal-footer form-action-footer"><span class="footer-spacer"></span><button type="button" class="button button-secondary" data-pc-close>Cancel</button><button type="submit" class="button button-primary">Save event</button></div>
      </form>
    `;
    document.body.appendChild(dialog);

    card.addEventListener("click", event => {
      const add = event.target.closest("[data-pc-add]");
      if (add) return openDialog();
      if (event.target.closest("[data-pc-prev]")) { viewDate.setMonth(viewDate.getMonth() - 1); return render(); }
      if (event.target.closest("[data-pc-next]")) { viewDate.setMonth(viewDate.getMonth() + 1); return render(); }
      if (event.target.closest("[data-pc-today]")) { viewDate = new Date(); return render(); }
      const day = event.target.closest("[data-pc-date]");
      if (day) { openDialog("", ""); document.getElementById("pcEventDate").value = day.dataset.pcDate; return; }
      const edit = event.target.closest("[data-pc-edit]");
      if (edit) return openDialog("", edit.dataset.pcEdit);
      const remove = event.target.closest("[data-pc-delete]");
      if (remove) return deleteEvent(remove.dataset.pcDelete);
      const ics = event.target.closest("[data-pc-ics]");
      if (ics) {
        const item = events.find(eventItem => eventItem.id === ics.dataset.pcIcs);
        if (item) downloadIcs(item);
      }
    });

    dialog.querySelector("#projectCalendarEventForm").addEventListener("submit", saveEvent);
    dialog.querySelectorAll("[data-pc-close]").forEach(button => button.addEventListener("click", closeDialog));

    // Add a Schedule button to each rendered project without modifying the core project renderer.
    const observeProjects = () => {
      document.querySelectorAll("#activeProjectList .project-record, #completedProjectList .project-record").forEach(row => {
        if (row.querySelector("[data-pc-project-schedule]")) return;
        const projectId = row.querySelector("[data-edit-project]")?.dataset.editProject;
        if (!projectId) return;
        const actions = row.querySelector(".project-row-actions, .desktop-record-actions");
        if (!actions) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary button-small project-compact-action";
        button.dataset.pcProjectSchedule = projectId;
        button.textContent = "Schedule";
        button.addEventListener("click", () => openDialog(projectId));
        actions.prepend(button);
      });
    };
    new MutationObserver(observeProjects).observe(document.getElementById("projects"), { subtree:true, childList:true });
    observeProjects();

    // Keep the project selector current when projects are added/renamed.
    document.addEventListener("click", () => {
      const select = document.getElementById("pcEventProject");
      if (select && !document.getElementById("projectCalendarEventDialog")?.open) select.innerHTML = projectOptions(select.value);
    });

    events = safeRead();
    render();

    // Make the release visible even though v13.0.20 is loaded as a modular extension.
    document.title = document.title.replace(/V\d+\.\d+\.\d+/i, `V${VERSION}`);
    const badge = document.getElementById("buildBadge");
    if (badge) badge.textContent = `V${VERSION}`;
  }

  function bootWhenAuthenticated() {
    if (document.documentElement.dataset.financeAuth === "signed-in" && !document.body.classList.contains("finance-signed-out")) {
      buildUi();
    }
  }

  window.addEventListener("finance:privacy-auth-change", bootWhenAuthenticated);

  window.addEventListener("finance:page-changed", event => {
    if (event.detail?.pageId === "projects") {
      bootWhenAuthenticated();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWhenAuthenticated, { once:true });
  } else {
    bootWhenAuthenticated();
  }
})();
