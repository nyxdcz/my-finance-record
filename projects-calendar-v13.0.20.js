"use strict";

/* My Finance Records V14.0.12 · Project Agenda
   Adds meeting, presentation, site-visit, deadline, and other project events.
   Agenda entries are stored separately from finance records so schedule changes never
   alter account balances, expenses, payments, or project financial values. */
(() => {
  const EVENTS_KEY = "simple-finance-project-calendar-v13.0.20";
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
  let editingId = "";

  const pad = value => String(value).padStart(2, "0");
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[char]));
  const safeExternalUrl = value => {
    try {
      const url = new URL(String(value || ""), location.href);
      return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
    } catch (error) {
      return "";
    }
  };
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

  // Read through storage every time so the Dashboard never receives a stale
  // in-memory agenda after another tab changes the shared browser record.
  window.getProjectAgendaEvents = () => safeRead();
  window.getProjectCalendarEvents = window.getProjectAgendaEvents;

  function safeWrite(next) {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
      return true;
    } catch (error) {
      showCalendarMessage("Agenda storage is full. Export an ICS file or remove old events.", "error");
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

  function agendaDateState(event) {
    if (event.completedAt) return { key:"completed", label:"Completed" };
    const eventDate = new Date(`${event.date || ""}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) return { key:"later", label:"Scheduled" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const days = Math.round((eventDate - today) / 86400000);
    if (days < 0) return { key:"overdue", label:`Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}` };
    if (days === 0) return { key:"near", label:"Today" };
    if (days <= 3) return { key:"near", label:`In ${days} day${days === 1 ? "" : "s"}` };
    if (days <= 7) return { key:"soon", label:`In ${days} days` };
    return { key:"later", label:"Scheduled" };
  }

  function eventCard(event, { compact = false } = {}) {
    const dateState = agendaDateState(event);
    const completed = Boolean(event.completedAt);
    const title = escapeHtml(event.title || "Untitled agenda event");
    const project = event.projectId ? ` · ${escapeHtml(projectName(event.projectId))}` : "";
    const externalUrl = safeExternalUrl(event.link);
    const mainTag = compact ? "button" : "div";
    const mainAttributes = compact ? `type="button" data-pc-edit="${escapeHtml(event.id)}" aria-label="Edit ${title}"` : "";
    const eventTitle = compact ? `<span class="pc-event-title">${title}</span>` : `<h4>${title}</h4>`;
    const eventMeta = compact ? `<span class="pc-event-meta">${escapeHtml(formatEventDate(event))}${project}</span>` : `<p>${escapeHtml(formatEventDate(event))}${project}</p>`;
    const details = compact ? "" : `
      ${event.location ? `<small>Location · ${escapeHtml(event.location)}</small>` : ""}
      ${event.attendees ? `<small>Attendees · ${escapeHtml(event.attendees)}</small>` : ""}
      ${event.reminder && event.reminder !== "none" ? `<small>Reminder · ${escapeHtml(reminderLabel(event.reminder))}</small>` : ""}
      ${externalUrl ? `<small><a href="${externalUrl}" target="_blank" rel="noopener noreferrer">Open meeting link</a></small>` : ""}
      ${event.notes ? `<small class="pc-event-notes">${escapeHtml(event.notes)}</small>` : ""}`;
    return `
      <article class="pc-event-card pc-type-${escapeHtml(event.type)} pc-date-${dateState.key} ${compact ? "pc-event-compact" : ""}" data-pc-event-card="${escapeHtml(event.id)}">
        <${mainTag} class="pc-event-main" ${mainAttributes}>
          <span class="pc-event-topline"><span class="pc-event-type">${escapeHtml(typeLabel(event.type))}</span><span class="pc-event-date-state">${escapeHtml(dateState.label)}</span></span>
          ${eventTitle}
          ${eventMeta}
          ${details}
        </${mainTag}>
        <div class="pc-event-actions">
          <button type="button" class="button ${completed ? "button-secondary" : "button-primary"} button-small" data-pc-complete="${escapeHtml(event.id)}">${completed ? "Reopen" : "Complete"}</button>
          ${compact ? "" : `<button type="button" class="button button-secondary button-small" data-pc-edit="${escapeHtml(event.id)}">Edit</button><button type="button" class="button button-secondary button-small" data-pc-delete="${escapeHtml(event.id)}">Delete</button><button type="button" class="button button-secondary button-small" data-pc-ics="${escapeHtml(event.id)}">ICS</button>`}
        </div>
      </article>`;
  }

  function render() {
    const root = document.getElementById("projectCalendarV13020");
    if (!root) return;
    const agendaEvents = sortedEvents(events);
    const upcoming = agendaEvents.filter(event => !event.completedAt);
    const completed = agendaEvents.filter(event => event.completedAt).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    const preview = upcoming.slice(0, 3);
    const previewList = root.querySelector("[data-pc-event-list]");
    previewList.innerHTML = preview.length
      ? preview.map(event => eventCard(event, { compact:true })).join("")
      : `<div class="pc-empty"><strong>No upcoming events</strong><span>${completed.length ? "Open the full agenda to review completed work." : "Add a meeting, presentation, site visit, or project deadline."}</span></div>`;
    const remaining = root.querySelector("[data-pc-remaining]");
    if (remaining) {
      remaining.hidden = upcoming.length <= preview.length;
      remaining.textContent = upcoming.length > preview.length ? `+${upcoming.length - preview.length} more upcoming` : "";
    }
    root.querySelector("[data-pc-count]").textContent = `${upcoming.length} upcoming · ${completed.length} completed`;

    const fullUpcoming = document.querySelector("[data-pc-full-upcoming]");
    const fullCompleted = document.querySelector("[data-pc-full-completed]");
    if (fullUpcoming) fullUpcoming.innerHTML = upcoming.length ? upcoming.map(event => eventCard(event)).join("") : `<div class="pc-empty"><strong>No upcoming events</strong><span>Schedule a project date to add it here.</span></div>`;
    if (fullCompleted) fullCompleted.innerHTML = completed.length ? completed.map(event => eventCard(event)).join("") : `<div class="pc-empty"><strong>No completed events</strong><span>Completed agenda entries will remain available here.</span></div>`;
    document.querySelectorAll("[data-pc-full-count]").forEach(node => { node.textContent = `${agendaEvents.length} total`; });
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
    document.getElementById("pcEventDate").value = event?.date || dateKey(new Date());
    document.getElementById("pcEventStart").value = event?.startTime || "09:00";
    document.getElementById("pcEventEnd").value = event?.endTime || "10:00";
    document.getElementById("pcEventLocation").value = event?.location || "";
    document.getElementById("pcEventLink").value = event?.link || "";
    document.getElementById("pcEventAttendees").value = event?.attendees || "";
    document.getElementById("pcEventReminder").value = event?.reminder || "P1D";
    document.getElementById("pcEventNotes").value = event?.notes || "";
    document.getElementById("projectCalendarEventDialogTitle").textContent = event ? "Edit agenda event" : "Schedule project event";
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
      completedAt: existing?.completedAt || "",
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    const next = existing ? events.map(item => item.id === id ? record : item) : [...events, record];
    if (!safeWrite(next)) return;
    events = next;
    closeDialog();
    render();
    notifyAgendaChanged(existing ? "updated" : "created", id);
    showCalendarMessage(existing ? "Agenda event updated." : "Agenda event scheduled.", "success");
  }

  function deleteEvent(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;
    if (!confirm(`Delete “${event.title}”?`)) return;
    const next = events.filter(item => item.id !== id);
    if (!safeWrite(next)) return;
    events = next;
    render();
    notifyAgendaChanged("deleted", id);
    showCalendarMessage("Agenda event deleted.", "success");
  }

  async function toggleEventCompleted(id) {
    const event = events.find(item => item.id === id);
    if (!event) return;
    const completing = !event.completedAt;
    if (completing && event.projectId && typeof window.completeProjectFromAgenda === "function") {
      const accepted = await window.completeProjectFromAgenda(event.projectId, event.title);
      if (!accepted) return;
    }
    const timestamp = new Date().toISOString();
    const next = events.map(item => item.id === id ? { ...item, completedAt:completing ? timestamp : "", updatedAt:timestamp } : item);
    if (!safeWrite(next)) return;
    events = next;
    render();
    notifyAgendaChanged(completing ? "completed" : "reopened", id);
    showCalendarMessage(completing ? "Agenda event completed." : "Agenda event reopened.", "success");
  }

  function openFullAgenda() {
    const dialog = document.getElementById("projectAgendaFullDialog");
    if (!dialog) return;
    render();
    dialog.showModal();
  }

  function closeFullAgenda() {
    document.getElementById("projectAgendaFullDialog")?.close();
  }

  function notifyAgendaChanged(action, id = "") {
    window.dispatchEvent(new CustomEvent("finance:project-agenda-changed", {
      detail: { action, id, count:events.length }
    }));
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
      `DTSTART