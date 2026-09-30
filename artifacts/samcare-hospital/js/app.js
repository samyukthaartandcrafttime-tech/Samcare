(function () {
  "use strict";

  const STORE = "samcare.local.v1";
  const MEET = "https://meet.google.com/fxe-yifr-njb";
  const UNREADABLE = "This file could not be reliably interpreted in local demo mode. Please verify the report with a healthcare professional.";
  const doctors = [
    { id: "DOC-SR001", name: "Dr. Samyuktha Raja", specialty: "Cardiologist", initials: "SR", availability: "Available today", room: "Consultation · Online" },
    { id: "DOC-RR002", name: "Dr. Reshmitha Raja", specialty: "Orthopedic", initials: "RR", availability: "Available tomorrow", room: "Consultation · Online" },
    { id: "DOC-VR003", name: "Dr. Vithya Raja", specialty: "Neurology", initials: "VR", availability: "Next opening · Wed", room: "Consultation · Online" },
    { id: "DOC-AM004", name: "Dr. Raja M.V.", specialty: "Doctor", initials: "RM", availability: "Available today", room: "Consultation · Online" }
  ];
  const demoPatients = [
    { id: "SC-284731", name: "Alex Morgan", age: 34, doctorId: "DOC-AM004", initials: "AM" },
    { id: "SC-391820", name: "Sarah Wilson", age: 42, doctorId: "DOC-SR001", initials: "SW" },
    { id: "SC-501643", name: "Daniel Thomas", age: 29, doctorId: "DOC-RR002", initials: "DT" },
    { id: "SC-725104", name: "Maya Joseph", age: 51, doctorId: "DOC-VR003", initials: "MJ" },
    { id: "SC-603218", name: "Ryan Mathew", age: 37, doctorId: "DOC-AM004", initials: "RM" },
    { id: "SC-486217", name: "Emily Thomas", age: 46, doctorId: "DOC-SR001", initials: "ET" },
    { id: "SC-128450", name: "Noah Mathews", age: 32, doctorId: "DOC-RR002", initials: "NM" },
    { id: "SC-914332", name: "Olivia James", age: 27, doctorId: "DOC-VR003", initials: "OJ" }
  ];
  const base = {
    users: [
      { id: "SC-284731", role: "patient", name: "Alex Morgan", password: "Patient@123" },
      { id: "DOC-SR001", role: "doctor", name: doctors[0].name, password: "SamCare@001" },
      { id: "DOC-RR002", role: "doctor", name: doctors[1].name, password: "SamCare@002" },
      { id: "DOC-VR003", role: "doctor", name: doctors[2].name, password: "SamCare@003" },
      { id: "DOC-AM004", role: "doctor", name: doctors[3].name, password: "SamCare@004" },
      { id: "STAFF-001", role: "staff", name: "Care Coordination", password: "Staff@123" }
    ],
    patients: demoPatients,
    doctors: doctors,
    appointments: [],
    connections: [],
    cases: [],
    notifications: [],
    consultations: [],
    memories: [],
    prescriptions: [],
    followUps: [],
    journey: [],
    records: [],
    challenge: { answered: [], score: 0, category: "All" }
  };
  let state = loadState();
  let session = loadSession();
  let page = "home";
  let loginRole = "patient";
  let enterRapidAfterLogin = false;
  let rapidMode = "injury";
  let rapidFile = null;
  let rapidPreviewUrl = "";
  let rapidConcern = "";
  let rapidFixture = "";
  let rapidDraft = null;
  let rapidStage = -1;
  let scanTimer = null;
  let selectedRecordTab = "All";
  let selectedCaseId = "";
  let activeConsultId = "";
  let quizFeedback = "";
  let chatHistory = [];
  let mobileNavOpen = false;
  const app = document.getElementById("app");
  if (!localStorage.getItem(STORE)) persist();

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE) || "null");
      const combined = Object.assign(clone(base), parsed || {});
      ["users", "patients", "doctors", "appointments", "connections", "cases", "notifications", "consultations", "memories", "prescriptions", "followUps", "journey", "records", "challenge"].forEach(key => {
        try {
          const value = localStorage.getItem("samcare.v1." + key);
          if (value !== null) combined[key] = JSON.parse(value);
        } catch (e) { /* Keep the last valid root snapshot. */ }
      });
      return combined;
    } catch (e) { return clone(base); }
  }
  function persist() {
    try {
      ["users", "patients", "doctors", "appointments", "connections", "cases", "notifications", "consultations", "memories", "prescriptions", "followUps", "journey", "records", "challenge"].forEach(key => {
        localStorage.setItem("samcare.v1." + key, JSON.stringify(state[key]));
      });
      localStorage.setItem(STORE, JSON.stringify(state));
    }
    catch (e) { toast("Local storage is full. Large file previews are not saved; remove an attachment and try again.", true); }
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem("samcare.session") || "null"); } catch (e) { return null; }
  }
  function saveSession(user) {
    session = user;
    if (user) localStorage.setItem("samcare.session", JSON.stringify(user));
    else localStorage.removeItem("samcare.session");
    render();
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function id(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function dateText(value, options) {
    if (!value) return "—";
    const d = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, options || { month: "short", day: "numeric", year: "numeric" });
  }
  function timeText(value) {
    if (!value) return "";
    const [h, m] = value.split(":").map(Number);
    const d = new Date(); d.setHours(h || 0, m || 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  function stamp(value) { return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""; }
  function currentDoctor() { return doctors.find(d => d.id === session?.id); }
  function getDoctor(idValue) { return doctors.find(d => d.id === idValue); }
  function patientUser() { return { id: "SC-284731", name: "Alex Morgan", role: "patient" }; }
  function addNotification(target, title, body, relatedId) {
    state.notifications.unshift({ id: id("NT"), target, title, body, relatedId: relatedId || "", createdAt: new Date().toISOString(), read: false });
  }
  function addJourney(title, detail, ref) {
    state.journey.unshift({ id: id("J"), title, detail, ref: ref || "", createdAt: new Date().toISOString(), patientId: "SC-284731" });
  }
  function toast(message, error) {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const node = document.createElement("div");
    node.className = "toast" + (error ? " error" : "");
    node.textContent = message;
    region.appendChild(node);
    setTimeout(() => node.remove(), 4200);
  }
  function brand() {
    return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M23.5 8.6a10 10 0 0 0-7.3-3.1 5.35 5.35 0 1 0 0 10.7h.2a5.35 5.35 0 1 1 0 10.7 10 10 0 0 1-7.6-3.5" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><circle cx="23.5" cy="8.6" r="2" fill="#b7e0da"/><circle cx="8.8" cy="23.4" r="2" fill="#b7e0da"/></svg></span><span class="brand-copy"><strong>SAMCARE</strong><span>Hospital · Connected care</span></span>`;
  }
  function initials(name) { return (name || "SC").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase(); }
  function navData(role) {
    if (role === "patient") return [
      ["home", "Overview", "⌂"], ["rapid", "Rapid Assist", "ϟ"], ["doctors", "Doctor Connect", "＋"], ["appointments", "Appointments", "▦"],
      ["journey", "My Care Journey", "⟶"], ["records", "Records", "▤"], ["ai", "SamCare AI", "✳"], ["challenge", "Health Challenge", "◉"]
    ];
    if (role === "doctor") return [
      ["home", "Overview", "⌂"], ["queue", "Patient queue", "▤"], ["cases", "Rapid Assist cases", "ϟ"], ["requests", "Connect requests", "＋"],
      ["appointments", "Appointments", "▦"], ["records", "Patient records", "▧"], ["treatment", "Treatment & follow-up", "＋"], ["notifications", "Notifications", "◌"]
    ];
    return [["home", "Coordination", "⌂"], ["alerts", "Rapid Assist alerts", "ϟ"], ["appointments", "Appointments", "▦"], ["queue", "Patient queue", "▤"], ["notifications", "Notifications", "◌"]];
  }
  function sidebar() {
    const nav = navData(session.role);
    return `<aside class="sidebar ${mobileNavOpen ? "open" : ""}" id="sidebar">
      <a class="brand" href="#" data-action="go-home" aria-label="SamCare home">${brand()}</a>
      <div class="nav-label">Care workspace</div><nav class="nav-list" aria-label="Main navigation">
      ${nav.map(([key, label, glyph]) => `<button class="nav-item ${page === key ? "active" : ""}" data-action="navigate" data-page="${key}" data-testid="nav-${key}"><span class="nav-glyph">${glyph}</span>${label}</button>`).join("")}
      </nav>
      <div class="nav-label">Account</div><button class="nav-item" data-action="logout" data-testid="logout-button"><span class="nav-glyph">↪</span>Sign out</button>
      <div class="sidebar-bottom"><div class="profile-mini"><span class="avatar">${initials(session.name)}</span><span><strong>${esc(session.name)}</strong><small>${session.role === "patient" ? "Patient · SC-284731" : session.role === "doctor" ? esc(session.id) : "Nurse / Staff"}</small></span></div><div class="small muted">Local competition demo · Not for clinical use</div></div>
    </aside>`;
  }
  function shell(content) {
    const label = session.role === "patient" ? "Patient portal" : session.role === "doctor" ? "Doctor workspace" : "Care coordination";
    return `<div class="app-frame"><div class="portal-shell">${sidebar()}<div class="workspace">
      <header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="toggle-menu" aria-label="Open navigation">☰</button><span>${label}</span><span>·</span><span>${new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</span></div>
      <div class="topbar-right"><span class="badge neutral">Local demo</span><button class="icon-button" data-action="navigate" data-page="notifications" aria-label="Notifications" data-testid="notifications-button">◌</button><span class="avatar">${initials(session.name)}</span></div></header>
      <main class="main-content">${content}</main></div></div></div>`;
  }
  function heading(eyebrow, title, desc, right) {
    return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${right || ""}</div>`;
  }
  function panel(title, body, extra) {
    return `<section class="panel panel-pad ${extra || ""}"><div class="panel-heading"><h2>${title}</h2></div>${body}</section>`;
  }
  function emptyState(title, desc, actionLabel, action, pageName) {
    return `<div class="empty"><strong>${title}</strong>${desc}${actionLabel ? `<div class="mt-12"><button class="btn btn-outline btn-small" data-action="${action}" ${pageName ? `data-page="${pageName}"` : ""}>${actionLabel}</button></div>` : ""}</div>`;
  }
  function doctorView(d) {
    if (!d) return "";
    return `<div class="doctor-meta"><span class="avatar large">${d.initials}</span><div><h3>${esc(d.name)}</h3><p>${esc(d.specialty)} · ${esc(d.id)}</p></div></div>`;
  }
  function myAppointments(patientOnly) {
    return state.appointments.filter(a => patientOnly ? a.patientId === "SC-284731" : a.doctorId === session.id);
  }
  function upcomingAppointment(list) {
    const now = new Date();
    return list.filter(a => a.status !== "CANCELLED" && new Date(a.date + "T" + a.time) >= new Date(now.getTime() - 2 * 3600000))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  }
  function appointmentStatus(a) {
    const when = new Date(a.date + "T" + a.time);
    if (a.status === "COMPLETED") return "CONSULTATION COMPLETED";
    if (a.status === "CANCELLED") return "CANCELLED";
    if (Date.now() >= when.getTime() && Date.now() < when.getTime() + 2 * 3600000) return "CONSULTATION NOW AVAILABLE";
    if (Date.now() > when.getTime() + 2 * 3600000) return "CONSULTATION COMPLETED";
    return "UPCOMING CONSULTATION";
  }
  function meetButton(a) {
    return `<a class="btn btn-primary btn-small" href="${esc(a.meetingLink || MEET)}" target="_blank" rel="noopener" data-action="join-meet" data-appointment="${esc(a.id)}" data-testid="join-${esc(a.id)}">Join consultation ↗</a>`;
  }
  function appointmentCard(a, doctorSide) {
    const d = getDoctor(a.doctorId);
    const p = state.patients.find(x => x.id === a.patientId) || { name: "Alex Morgan", id: "SC-284731" };
    return `<div class="alert-card"><div class="alert-head"><div><h3>${doctorSide ? esc(p.name) : esc(d?.name || "Care team")}</h3><div class="small muted">${doctorSide ? esc(p.id) : esc(d?.specialty || "Care team")}</div></div><span class="badge ${a.status === "CANCELLED" ? "neutral" : "blue"}">${appointmentStatus(a)}</span></div>
      <div class="gap-row small muted mt-12"><span>${dateText(a.date)}</span><span>·</span><span>${timeText(a.time)}</span><span>·</span><span>${esc(a.consultationType || "Online")}</span></div>
      ${a.doctorReady || a.patientJoined ? `<div class="gap-row mt-12">${a.doctorReady ? `<span class="badge">Doctor ready</span>` : ""}${a.patientJoined ? `<span class="badge blue">Patient joined</span>` : ""}</div>` : ""}
      ${a.reason ? `<p class="small muted">${esc(a.reason)}</p>` : ""}
      <div class="gap-row mt-12">${meetButton(a)}<button class="btn btn-outline btn-small" data-action="open-consult" data-appointment="${esc(a.id)}">SamCare consult</button>${a.status !== "CANCELLED" && a.status !== "COMPLETED" ? `<button class="btn btn-outline btn-small" data-action="cancel-appointment" data-id="${esc(a.id)}">Cancel</button>` : ""}</div>
      <div class="notice-line">Shared meeting room stored on appointment · <a href="${esc(a.meetingLink || MEET)}" target="_blank" rel="noopener">${esc(a.meetingLink || MEET)}</a></div></div>`;
  }
  function notificationsForUser() {
    if (session.role === "patient") return state.notifications.filter(n => n.target === "patient" || n.target === session.id);
    if (session.role === "doctor") return state.notifications.filter(n => n.target === session.id || n.target === "doctor");
    return state.notifications.filter(n => n.target === "staff");
  }
  function patientHome() {
    const appts = myAppointments(true);
    const upcoming = upcomingAppointment(appts);
    const connected = state.connections.find(c => c.patientId === "SC-284731" && c.status === "ACCEPTED");
    const doctor = connected ? getDoctor(connected.doctorId) : null;
    const cases = state.cases.filter(c => c.patientId === "SC-284731");
    const alerts = state.cases.filter(c => c.patientId === "SC-284731").map(c => c.staffStatus).filter(Boolean);
    const prescriptions = state.prescriptions.filter(p => p.patientId === "SC-284731");
    const followups = state.followUps.filter(f => f.patientId === "SC-284731" && f.status !== "COMPLETED");
    const notifs = notificationsForUser().slice(0, 3);
    return `${heading("Patient portal", "Welcome back, Alex.", "Your care, connected from the first concern through follow-up.", `<span class="badge">${esc(session.id)}</span>`)}
      <div class="rapid-hero"><div><div class="eyebrow">SamCare rapid support</div><h2>Tell us what you need help with.</h2><p>Share an injury, report or general concern. Rapid Assist helps organize your next step — it does not diagnose.</p><div class="rapid-hero-actions"><button class="btn btn-primary" data-action="navigate" data-page="rapid" data-testid="rapid-assist-start">ϟ Start Rapid Assist</button><button class="btn btn-outline" data-action="navigate" data-page="doctors">Explore doctors</button></div></div><div class="rapid-symbol" aria-hidden="true">ϟ</div></div>
      <div class="inline-stats">
        <div class="stat-tile"><small>Today's care</small><strong>${upcoming ? "Appointment ahead" : "Ready when you are"}</strong><div class="stat-note">${upcoming ? `${dateText(upcoming.date)} · ${timeText(upcoming.time)}` : "No appointments scheduled"}</div></div>
        <div class="stat-tile"><small>Open care cases</small><strong>${cases.filter(c => c.staffStatus !== "RESOLVED").length} active</strong><div class="stat-note">${cases.length ? "Shared with your care team" : "No active Rapid Assist cases"}</div></div>
        <div class="stat-tile"><small>Treatment & follow-up</small><strong>${prescriptions.length} prescription${prescriptions.length === 1 ? "" : "s"}</strong><div class="stat-note">${followups.length ? `Next · ${dateText(followups[0].date)} · ${followups[0].reason}` : "Nothing due right now"}</div></div>
      </div>
      <div class="content-grid mt-12">
        <div class="stack">
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>Today's care</h2><p>Your next confirmed step with SamCare</p></div><button class="btn btn-outline btn-small" data-action="navigate" data-page="appointments">All appointments</button></div>
            ${upcoming ? appointmentCard(upcoming, false) : emptyState("Nothing scheduled yet", "Browse the doctor directory to find the right care.", "Find a doctor", "navigate", "doctors")}
          </section>
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>My care journey</h2><p>Every important step stays connected.</p></div><button class="btn btn-outline btn-small" data-action="navigate" data-page="journey">View journey</button></div>${journeyPreview()}</section>
        </div>
        <div class="stack">
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>My connected doctor</h2><p>Only accepted care connections appear here.</p></div></div>${doctor ? `<div class="profile-doctor"><span class="avatar large">${doctor.initials}</span><div><h3>${esc(doctor.name)}</h3><p>${esc(doctor.specialty)}</p></div></div><div class="rule"></div><button class="btn btn-outline btn-small" data-action="navigate" data-page="appointments">Book a visit</button>` : emptyState("No doctor connected yet", "Choose Connect in the directory. Your request will be shared with that doctor's workspace.", "Browse doctors", "navigate", "doctors")}</section>
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>Care team updates</h2><p>Recent activity from your shared care records</p></div></div>${notifs.length ? notifs.map(notificationRow).join("") : emptyState("Your updates will appear here", "A case, connection or booking will add a useful update.", "Start with Rapid Assist", "navigate", "rapid")}</section>
        </div>
      </div>`;
  }
  function journeyPreview() {
    const events = state.journey.filter(e => e.patientId === "SC-284731").slice(0, 4);
    if (!events.length) return `<div class="journey"><div class="journey-step current"><strong>Start with a concern</strong><small>Your journey begins when you use Rapid Assist or connect with a doctor.</small></div><div class="journey-step"><strong>Care, connected</strong><small>Appointments, consultation memory and follow-up will appear here.</small></div></div>`;
    return `<div class="journey">${events.map((e, i) => `<div class="journey-step ${i === 0 ? "current" : "done"}"><strong>${esc(e.title)}</strong><small>${esc(e.detail)} · ${stamp(e.createdAt)}</small></div>`).join("")}</div>`;
  }
  function notificationRow(n) {
    return `<div class="notification"><span class="row-icon">◌</span><div><p><strong>${esc(n.title)}</strong> — ${esc(n.body)}</p><small>${stamp(n.createdAt)}</small></div></div>`;
  }
  function rapidPage() {
    const modeOptions = [["injury", "Injury image"], ["report", "Health report"], ["general", "General concern"], ["emergency", "Emergency support"]];
    let fileMarkup = rapidFile ? `<div class="upload-preview">${rapidFile.type.startsWith("image/") && rapidPreviewUrl ? `<img src="${rapidPreviewUrl}" alt="Selected image preview">` : `<span class="row-icon">▤</span>`}<div><strong>${esc(rapidFile.name)}</strong><div class="small muted">${esc(rapidFile.type || "File")} · ${Math.ceil(rapidFile.size / 1024)} KB</div></div><button class="btn btn-outline btn-small" data-action="remove-file">Remove</button></div>` : "";
    let analysis = rapidDraft ? rapidResultMarkup() : "";
    return `${heading("Rapid Assist · local demo", "A clearer next step starts here.", "Tell us what brought you in. This local demo organizes your information for a healthcare professional.", `<span class="badge warn">Not for emergencies</span>`)}
      <div class="content-grid">
        <div class="stack">
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>What do you need help with?</h2><p>Choose a route — the selection guides demo specialty matching only.</p></div><span class="badge">Step 01 · Share</span></div>
            <div class="assist-options">${modeOptions.map(([k, label]) => `<button class="choice ${rapidMode === k ? "selected" : ""}" data-action="rapid-mode" data-mode="${k}" data-testid="rapid-mode-${k}">${label}</button>`).join("")}</div>
            ${rapidMode !== "emergency" ? `<div class="field"><label for="concern">Your concern in your own words</label><textarea id="concern" placeholder="${rapidMode === "injury" ? "For example, which area is affected and what would you like your care team to know?" : rapidMode === "report" ? "Add a note about the report if helpful. Uploaded files are not read in this demo." : "Describe what you would like help with."}" data-testid="rapid-concern">${esc(rapidConcern)}</textarea></div>` : `<div class="medical-alert"><strong>If this may be an emergency, call your local emergency number or go to the nearest emergency department now.</strong> Rapid Assist is not an emergency service and is not monitored continuously.</div>`}
            ${rapidMode === "report" ? `<div class="field"><label for="fixture">Optional labelled demo report fixture</label><select id="fixture" data-testid="report-fixture"><option value="">No fixture — file will not be interpreted</option><option value="bp" ${rapidFixture==="bp"?"selected":""}>Demo fixture: blood pressure, 146/92 mmHg (reference shown in fixture: &lt;120/80 mmHg)</option><option value="lipid" ${rapidFixture==="lipid"?"selected":""}>Demo fixture: LDL cholesterol, 162 mg/dL (reference shown in fixture: &lt;100 mg/dL)</option></select><div class="small muted">Fixture values are sample values for demonstration only; they were not extracted from your uploaded file.</div></div>` : ""}
            <div class="field"><label>Optional attachment · image or PDF</label><div class="upload-zone"><input type="file" accept="image/*,application/pdf" data-testid="rapid-upload" aria-label="Upload image or PDF"><strong>Choose a file to preview</strong><span>Image preview is local to this browser. PDF can be referenced only — no OCR or report interpretation.</span></div>${fileMarkup}</div>
            <div class="safety-note">Local demo analysis is rule-based and uses your selected concern or an explicitly labelled sample fixture. Uploaded images and reports are not medically interpreted.</div>
            <div class="gap-row mt-12"><button class="btn btn-primary" data-action="start-analysis" data-testid="start-analysis" ${rapidStage >= 0 && rapidStage < 8 ? "disabled" : ""}>${rapidStage >= 0 && rapidStage < 8 ? "Analysis in progress…" : "Continue to demo analysis"}</button>${rapidDraft ? `<button class="btn btn-outline" data-action="reset-rapid">Start a new case</button>` : ""}</div>
          </section>
          ${rapidStage >= 0 ? `<section class="panel panel-pad"><div class="panel-heading"><div><h2>Analysis progress</h2><p>Visible states follow local demo processing, not clinical image analysis.</p></div><span class="badge ${rapidStage >= 8 ? "" : "blue"}">${rapidStage >= 8 ? "Ready for review" : `Step ${Math.min(rapidStage + 1, 8)} of 8`}</span></div>${rapidProcessMarkup()}</section>` : ""}
          ${analysis}
        </div>
        <div class="stack">
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>Connected care pathway</h2><p>From your concern to professional follow-up</p></div></div>${flowbar(["Share concern", "Route care", "Connect", "Appointment", "Consult", "Follow-up"], Math.min(state.journey.length + 1, 6))}</section>
          <section class="panel panel-pad"><div class="panel-heading"><div><h2>Need urgent help?</h2><p>Do not wait for a demo response.</p></div><span class="badge warn">Emergency</span></div><div class="medical-alert">For severe symptoms or immediate danger, contact emergency services or visit the nearest emergency department now.</div></section>
        </div>
      </div>`;
  }
  function flowbar(items, progress) {
    return `<div class="flowbar">${items.map((item, i) => `${i ? `<span class="flow-arrow">›</span>` : ""}<div class="flow-node ${i < progress ? "complete" : ""}">${esc(item)}</div>`).join("")}</div>`;
  }
  const stageNames = ["FILE RECEIVED", "SCANNING", "ANALYZING AVAILABLE INFORMATION", "IDENTIFYING CARE CATEGORY", "MATCHING APPROPRIATE CARE", "DOCTOR MATCHED", "PREPARING CLINICAL SUMMARY", "SECURE HANDOFF"];
  function rapidProcessMarkup() {
    return `<div class="scan-frame ${rapidStage > 0 && rapidStage < 5 ? "scanning" : ""}">${rapidPreviewUrl && rapidFile?.type.startsWith("image/") ? `<img src="${rapidPreviewUrl}" alt="Local preview of selected image">` : `<div><div style="font-size:33px;text-align:center">ϟ</div><strong>${rapidFile ? "Attachment received" : "Concern received"}</strong><div class="small">${rapidFile ? esc(rapidFile.name) : "No file attached · text-only demo"}</div></div>`}</div>
      <div class="stage-list">${stageNames.map((s, i) => `<div class="stage ${rapidStage === i ? "active" : rapidStage > i ? "done" : ""}"><i>${rapidStage > i ? "✓" : String(i + 1).padStart(2, "0")}</i>${s}</div>`).join("")}</div>
      ${rapidStage >= 8 ? `<div class="safety-note">Progress completed. No medical image interpretation or file OCR was performed.</div>` : ""}`;
  }
  function rapidResultMarkup() {
    const d = getDoctor(rapidDraft.doctorId);
    const reportFixture = rapidDraft.fixture;
    let findings = UNREADABLE;
    if (reportFixture === "bp") findings = "DEMO FIXTURE ONLY — Blood pressure: 146/92 mmHg · Reference shown in fixture: <120/80 mmHg · Outside provided range. Not extracted from the uploaded file.";
    if (reportFixture === "lipid") findings = "DEMO FIXTURE ONLY — LDL cholesterol: 162 mg/dL · Reference shown in fixture: <100 mg/dL · Outside provided range. Not extracted from the uploaded file.";
    const fixtureTable = reportFixture === "bp" ? `<div class="table-wrap"><table class="table"><thead><tr><th>Demo fixture test</th><th>Sample result</th><th>Unit</th><th>Fixture reference</th><th>Comparison</th></tr></thead><tbody><tr><td>Blood pressure</td><td>146/92</td><td>mmHg</td><td>&lt;120/80 mmHg</td><td><span class="badge warn">Outside provided range</span></td></tr></tbody></table></div><p class="small muted">Sample fixture only. Not extracted from uploaded file; not a diagnosis.</p>` : reportFixture === "lipid" ? `<div class="table-wrap"><table class="table"><thead><tr><th>Demo fixture test</th><th>Sample result</th><th>Unit</th><th>Fixture reference</th><th>Comparison</th></tr></thead><tbody><tr><td>LDL cholesterol</td><td>162</td><td>mg/dL</td><td>&lt;100 mg/dL</td><td><span class="badge warn">Outside provided range</span></td></tr></tbody></table></div><p class="small muted">Sample fixture only. Not extracted from uploaded file; not a diagnosis.</p>` : "";
    const concernCategory = rapidDraft.categoryTitle;
    const sent = rapidDraft.sent;
    return `<section class="panel panel-pad" id="rapid-summary"><div class="panel-heading"><div><h2>Rapid Assist clinical-support summary</h2><p>Case details are shared only after you choose Send clinical summary.</p></div><span class="badge ${sent ? "" : "blue"}">${sent ? `Sent · ${esc(rapidDraft.caseId)}` : "Review before send"}</span></div>
      <div class="concern-box"><h3>${esc(concernCategory)}</h3><p><strong>Patient:</strong> Alex Morgan · SC-284731 · ${stamp(rapidDraft.createdAt)}</p><p><strong>Attachment:</strong> ${rapidFile ? `${esc(rapidFile.name)} (${esc(rapidFile.type || "file")}) · preview/reference only` : "No attachment provided"}</p>
      ${rapidMode === "injury" ? `<p><strong>What is visible:</strong> Not assessed. This local demo does not interpret uploaded images.</p><p><strong>What requires clinical confirmation:</strong> Any injury, visible features or underlying cause.</p>` : ""}
      ${rapidMode === "report" ? `<p><strong>Available information:</strong> ${esc(findings)}</p>${fixtureTable}` : ""}
      ${reportFixture ? `<p><strong>CARDIOVASCULAR EVALUATION RECOMMENDED.</strong> These demo fixture findings may warrant cardiovascular evaluation; please verify them with a healthcare professional.</p>` : ""}
      <p><strong>User-provided concern:</strong> ${esc(rapidDraft.concern || "No additional description provided.")}</p>
      <p><strong>Urgency:</strong> ${esc(rapidDraft.urgency)} · <strong>Recommended care:</strong> ${esc(rapidDraft.categoryTitle)}</p>
      <p><strong>Recommended doctor:</strong> ${d ? `${esc(d.name)} · ${esc(d.specialty)}` : "General clinical assessment; select a doctor from the directory."}</p>
      <p><strong>Routing reason:</strong> ${esc(rapidDraft.routingReason)}</p><p><strong>Recommended next step:</strong> ${esc(rapidDraft.nextStep)}</p></div>
      <p class="notice-line"><strong>This recommendation is based on available information and is not a medical diagnosis.</strong></p>
      ${sent ? `<div class="safety-note mt-12">Clinical-support summary saved to LocalStorage. ${d ? `${esc(d.name)} has received case ${esc(rapidDraft.caseId)}.` : "Your case is available to the care coordination team."} A staff alert and patient care-journey event were also created.</div><div class="gap-row mt-12">${d ? `<button class="btn btn-primary btn-small" data-action="book-doctor" data-doctor="${esc(d.id)}" data-case="${esc(rapidDraft.caseId)}">Book with recommended doctor</button><button class="btn btn-outline btn-small" data-action="connect-doctor" data-doctor="${esc(d.id)}">Connect with doctor</button>` : `<button class="btn btn-outline btn-small" data-action="navigate" data-page="doctors">Browse doctors</button>`}<button class="btn btn-outline btn-small" data-action="navigate" data-page="journey">View care journey</button></div>` : `<div class="gap-row mt-12"><button class="btn btn-primary" data-action="send-summary" data-testid="send-summary">Send clinical summary</button><button class="btn btn-outline" data-action="edit-concern">Review concern</button></div>`}
    </section>`;
  }
  function doctorDirectory() {
    const accepted = state.connections.find(c => c.patientId === "SC-284731" && c.status === "ACCEPTED");
    return `${heading("Doctor Connect", "Find your care team.", "Browse the SamCare clinicians and choose the connection or appointment that works for you.")}
      ${accepted ? `<section class="panel panel-pad" style="margin-bottom:16px"><div class="panel-heading"><div><h2>My connected doctor</h2><p>Your accepted connection</p></div><span class="badge">Connected</span></div>${doctorView(getDoctor(accepted.doctorId))}</section>` : ""}
      <div class="doctor-directory">${doctors.map(d => {
        const conn = state.connections.find(c => c.patientId === "SC-284731" && c.doctorId === d.id);
        const isConnected = conn?.status === "ACCEPTED";
        const pending = conn?.status === "PENDING";
        return `<article class="panel doctor-card"><div class="doctor-card-top">${doctorView(d)}<span class="badge ${isConnected ? "" : "blue"}">${isConnected ? "Connected" : pending ? "Request pending" : "Fictional demo profile"}</span></div><div class="doctor-stats"><span>${esc(d.availability)}</span><span>${esc(d.room)}</span></div><div class="doctor-actions"><button class="btn ${isConnected || pending ? "btn-outline" : "btn-primary"} btn-small" data-action="connect-doctor" data-doctor="${esc(d.id)}" ${isConnected || pending ? "disabled" : ""} data-testid="connect-${esc(d.id)}">${isConnected ? "Connected" : pending ? "Request sent" : "Connect"}</button><button class="btn btn-outline btn-small" data-action="book-doctor" data-doctor="${esc(d.id)}">Book appointment</button></div></article>`;
      }).join("")}</div>`;
  }
  function bookingForm() {
    const preselect = new URLSearchParams(location.search).get("doctor") || "";
    return `<section class="panel panel-pad"><div class="panel-heading"><div><h2>Book an appointment</h2><p>Select a clinician, date and available time. A shared meeting room is attached automatically.</p></div><span class="badge blue">Online consultation</span></div>
      <form id="booking-form" data-testid="booking-form"><div class="form-row"><div class="field"><label for="book-doctor">Doctor</label><select id="book-doctor" name="doctorId" required data-testid="book-doctor"><option value="">Choose a doctor</option>${doctors.map(d => `<option value="${d.id}" ${preselect === d.id ? "selected" : ""}>${esc(d.name)} · ${esc(d.specialty)}</option>`).join("")}</select></div><div class="field"><label for="book-date">Date</label><input id="book-date" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" required data-testid="book-date"></div></div>
      <div class="form-row"><div class="field"><label for="book-time">Available time</label><select id="book-time" name="time" required data-testid="book-time"><option value="">Choose a time</option>${["09:00","10:30","12:00","14:00","15:30","17:00"].map(t => `<option value="${t}">${timeText(t)}</option>`).join("")}</select></div><div class="field"><label for="book-reason">Reason (optional)</label><input id="book-reason" name="reason" maxlength="120" placeholder="What would you like to discuss?"></div></div>
      <input type="hidden" id="book-case" name="caseId" value="${esc(rapidDraft?.caseId || "")}"><div class="safety-note">Appointment and shared Google Meet link are saved together in this browser's LocalStorage. The same link will appear to the patient and assigned doctor.</div><div class="mt-12"><button class="btn btn-primary" type="submit" data-testid="confirm-appointment">Confirm appointment</button></div></form></section>`;
  }
  function appointmentsPage() {
    const appts = myAppointments(true);
    return `${heading("Appointments", "Your care, on the calendar.", "Book a clinician and manage the shared consultation details.", `<span class="badge">${appts.length} saved</span>`)}
      <div class="content-grid"><div class="stack">${bookingForm()}<section class="panel panel-pad"><div class="panel-heading"><div><h2>Your appointments</h2><p>Each appointment carries the same meeting link for patient and doctor.</p></div></div>${appts.length ? appts.slice().sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time)).map(a => appointmentCard(a, false)).join("") : emptyState("No appointments yet", "Choose a doctor above to create your first appointment.")}</section></div>
      <div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Consultation ready</h2><p>Google Meet room attached to each appointment</p></div></div>${upcomingAppointment(appts) ? appointmentCard(upcomingAppointment(appts), false) : emptyState("Your meeting room appears here", "After booking, both you and your doctor receive the same saved meeting URL.")}</section><section class="panel panel-pad"><h2 class="section-title">A connected visit</h2><p class="muted small">The SamCare consultation page organizes notes and care records. The actual video meeting opens in Google Meet.</p><div class="link-box">${MEET}</div></section></div></div>`;
  }
  function patientJourney() {
    const stages = [
      ["Rapid Assist", state.cases.filter(c => c.patientId === "SC-284731"), c => c.concernCategory],
      ["Doctor match", state.cases.filter(c => c.patientId === "SC-284731" && c.doctorId), c => getDoctor(c.doctorId)?.name || "Care team routing"],
      ["Doctor connect", state.connections.filter(c => c.patientId === "SC-284731" && c.status === "ACCEPTED"), c => getDoctor(c.doctorId)?.name || "Connected"],
      ["Appointment", state.appointments.filter(a => a.patientId === "SC-284731"), a => `${dateText(a.date)} · ${timeText(a.time)}`],
      ["Consultation", state.consultations.filter(c => c.patientId === "SC-284731"), c => c.status],
      ["Consultation memory", state.memories.filter(m => m.patientId === "SC-284731"), m => m.summary || m.reason],
      ["Prescription", state.prescriptions.filter(p => p.patientId === "SC-284731"), p => `${p.medicine} · ${p.status}`],
      ["Treatment", state.prescriptions.filter(p => p.patientId === "SC-284731"), p => `Status: ${p.status}`],
      ["Follow-up", state.followUps.filter(f => f.patientId === "SC-284731"), f => `${dateText(f.date)} · ${f.reason}`]
    ];
    const existingCount = stages.filter(s => s[1].length).length;
    return `${heading("My care journey", "SAMCARE DOES NOT JUST BOOK A DOCTOR.", "Every important step stays connected — with events drawn from the actions you take.", `<span class="badge">${existingCount} of 9 stages started</span>`)}
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>One patient. One connected healthcare journey.</h2><p>Completed steps are based on your LocalStorage records. No care events are pre-completed.</p></div></div>
      <div class="journey">${stages.map(([name, items, detail], i) => {
        const first = items[0];
        const cls = items.length ? "done" : (i === existingCount ? "current" : "");
        const when = first?.createdAt ? ` · ${stamp(first.createdAt)}` : "";
        return `<div class="journey-step ${cls}"><strong>${esc(name)} ${items.length ? `<span class="badge">${items.length} event${items.length === 1 ? "" : "s"}</span>` : ""}</strong><small>${first ? esc(detail(first)) + when : i === existingCount ? "Current next step — continue when ready." : "Not started yet."}</small></div>`;
      }).join("")}</div></section><div class="content-grid mt-12"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Recent care activity</h2><p>From shared local records</p></div></div>${state.journey.filter(e => e.patientId === "SC-284731").length ? state.journey.filter(e => e.patientId === "SC-284731").map(e => `<div class="row-item"><span class="row-icon">✓</span><div class="row-body"><strong>${esc(e.title)}</strong><p>${esc(e.detail)} · ${stamp(e.createdAt)}</p></div></div>`).join("") : emptyState("Your timeline is ready", "Use Rapid Assist, connect with a doctor or book a visit to add the first event.", "Start Rapid Assist", "navigate", "rapid")}</section><section class="panel panel-pad"><h2 class="section-title">Care, carried forward.</h2><p class="muted">Appointments, consultation memories, prescriptions and follow-ups are connected to your patient ID and are visible in Records.</p><button class="btn btn-outline btn-small" data-action="navigate" data-page="records">Open records</button></section></div>`;
  }
  function patientRecords() {
    const all = [
      ...state.cases.filter(x=>x.patientId==="SC-284731").map(x=>({type:"Rapid Assist", date:x.createdAt, title:`${x.concernCategory} · ${x.id}`, text:x.routingReason, status:x.status})),
      ...state.appointments.filter(x=>x.patientId==="SC-284731").map(x=>({type:"Appointment",date:x.createdAt,title:`${getDoctor(x.doctorId)?.name || "Doctor"} · ${dateText(x.date)} ${timeText(x.time)}`,text:x.reason || "Online consultation",status:x.status})),
      ...state.memories.filter(x=>x.patientId==="SC-284731").map(x=>({type:"Consultation memory",date:x.createdAt,title:`${x.reason || "Consultation"} · ${getDoctor(x.doctorId)?.name || ""}`,text:x.summary,status:"Saved"})),
      ...state.prescriptions.filter(x=>x.patientId==="SC-284731").map(x=>({type:"Prescription",date:x.createdAt,title:x.medicine,text:x.instructions,status:x.status})),
      ...state.followUps.filter(x=>x.patientId==="SC-284731").map(x=>({type:"Follow-up",date:x.createdAt,title:`${dateText(x.date)} · ${x.reason}`,text:getDoctor(x.doctorId)?.name || "",status:x.status}))
    ].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const filtered = selectedRecordTab === "All" ? all : all.filter(x=>x.type===selectedRecordTab);
    const tabs = ["All","Rapid Assist","Appointment","Consultation memory","Prescription","Follow-up"];
    return `${heading("Records", "A clear record of your care.", "Appointments, support cases and treatment records stored in this browser.")}
      <section class="panel panel-pad"><div class="record-tabs">${tabs.map(t=>`<button class="tab-button ${selectedRecordTab===t?"active":""}" data-action="record-tab" data-tab="${esc(t)}">${esc(t)}</button>`).join("")}</div>${filtered.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Record</th><th>Details</th><th>Status</th><th>Date</th></tr></thead><tbody>${filtered.map(r=>`<tr><td><strong>${esc(r.type)}</strong></td><td>${esc(r.title)}<div class="small muted">${esc(r.text||"")}</div></td><td><span class="badge ${r.status==="RESOLVED"||r.status==="COMPLETED"?"":"blue"}">${esc(r.status||"Saved")}</span></td><td>${dateText(r.date)}</td></tr>`).join("")}</tbody></table></div>`:emptyState("No records in this category", "Your records update when you take actions in SamCare.", "Start with Rapid Assist","navigate","rapid")}</section>`;
  }
  function patientNotifications() {
    const items=notificationsForUser();
    return `${heading("Notifications", "Updates from your care team.", "Only actions connected to your local care records appear here.")}<section class="panel panel-pad">${items.length?items.map(notificationRow).join(""):emptyState("Nothing new", "When you submit a case, connect with a doctor or book a visit, updates appear here.","Start Rapid Assist","navigate","rapid")}</section>`;
  }
  const quiz = [
    { category:"Hydration", question:"Which is a helpful everyday way to support hydration?", options:["Drink when thirsty and keep water accessible","Avoid water until evening","Replace all water with sweetened drinks"], correct:0, fact:"Water needs vary with activity, climate and health. Keep water accessible and follow clinician advice if you have fluid restrictions." },
    { category:"Sleep", question:"Which habit can support a steadier sleep routine?", options:["Keep a consistent wind-down time","Use bright screens in bed all night","Change bedtime by several hours daily"], correct:0, fact:"A regular, calming bedtime routine can support sleep. Persistent sleep concerns are worth discussing with a healthcare professional." },
    { category:"Preventive care", question:"What is a useful approach to preventive appointments?", options:["Follow screening advice suited to your age and health","Wait for severe symptoms for every check","Use another person's schedule"], correct:0, fact:"Screening recommendations depend on individual health history. Ask your healthcare professional what is right for you." },
    { category:"Nutrition", question:"Which is a balanced everyday nutrition idea?", options:["Include a variety of foods when available","Avoid whole food groups without clinical advice","Treat one meal as a measure of health"], correct:0, fact:"A varied eating pattern can support wellbeing. Individual nutrition needs differ; a clinician or dietitian can help with personal guidance." },
    { category:"Hygiene", question:"When is handwashing especially helpful?", options:["Before preparing food and after using the restroom","Only when hands look dirty","Only once each morning"], correct:0, fact:"Wash hands with soap and water at key times, including before food preparation and after using the restroom." },
    { category:"Mental wellbeing", question:"What can be a gentle first step when stress builds?", options:["Take a brief pause and reach out to someone trusted","Ignore every sign of distress","Assume everyone copes the same way"], correct:0, fact:"A pause, supportive conversation or professional help may be useful. If you feel unsafe, contact emergency services or a crisis support service in your area." },
    { category:"Healthy habits", question:"Which approach can make a new healthy habit more manageable?", options:["Choose a small step that fits your routine","Change everything at once","Compare your progress with someone else's"], correct:0, fact:"Small, sustainable changes can be easier to maintain. Your needs and pace are individual." }
  ];
  function challengePage() {
    const q=quiz[state.challenge.answered.length%quiz.length];
    const answered=state.challenge.answered.includes(q.question);
    return `${heading("Health awareness", "Small steps, steady wellbeing.", "A short learning moment. Choose what feels sustainable for you.", `<span class="badge">${state.challenge.score} points</span>`)}
      <div class="content-grid"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Today's question · ${esc(q.category)}</h2><p>Educational only — not personal medical advice.</p></div><span class="badge blue">Question ${state.challenge.answered.length+1}</span></div><h3 class="section-title">${esc(q.question)}</h3>${answered?`<div class="safety-note mt-12">${esc(quizFeedback || q.fact)}</div><button class="btn btn-outline btn-small mt-12" data-action="next-quiz">Next question</button>`:q.options.map((o,i)=>`<button class="quiz-option" data-action="answer-quiz" data-answer="${i}" data-testid="quiz-answer-${i}">${esc(o)}</button>`).join("")}<div class="rule"></div><div class="small muted">Categories rotate through sleep, hydration, preventive care and other healthy habits. No weight or calorie targets.</div></section>
      <div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Your learning progress</h2><p>Saved on this device</p></div></div><div class="gap-row"><strong>${state.challenge.answered.length}</strong><span class="small muted">questions answered</span></div><div class="progress-track mt-12"><span style="width:${Math.min(100,state.challenge.answered.length*12)}%"></span></div><p class="small muted">${state.challenge.score} correct · progress continues at your own pace</p></section><section class="panel panel-pad"><h2 class="section-title">A gentle reminder</h2><p class="muted small">Health habits are personal. Choose changes that feel safe and sustainable; ask a clinician for individualized guidance.</p></section></div></div>`;
  }
  function aiPage() {
    const defaultMessage = "Hello Alex. I can help explain SamCare features or prepare questions for your care team. I'm a local rule-based demo, not a medical professional.";
    const bubbles=(chatHistory.length?chatHistory:[{who:"ai",text:defaultMessage}]).map(m=>`<div class="chat-bubble ${m.who==="user"?"user":""}">${esc(m.text)}</div>`).join("");
    return `${heading("Powered by SamCare AI", "A little help, right here.", "A local rule-based guide for SamCare navigation and general health information.")}
      <div class="content-grid"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Ask SamCare AI</h2><p>Prepared local responses · no external AI or API</p></div><span class="badge blue">Demo assistant</span></div><div class="chat-window" id="chat-window">${bubbles}</div><form class="chat-compose" id="chat-form"><input class="chat-input" id="chat-question" placeholder="Ask about appointments, records or care journey…" aria-label="Ask SamCare AI" data-testid="ai-input"><button class="btn btn-primary" type="submit" data-testid="ai-send">Ask</button></form><div class="safety-note mt-12"><strong>SamCare AI provides general information and does not replace professional medical advice.</strong> It cannot assess symptoms, diagnose conditions or recommend treatment.</div></section>
      <div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Quick topics</h2><p>Select a prompt to get a local response.</p></div></div>${["Appointment instructions","Preparing questions for a doctor","Explain my care journey","Prescription instructions","General health information"].map(x=>`<button class="quiz-option" data-action="ai-prompt" data-prompt="${esc(x)}">${esc(x)} →</button>`).join("")}</section><section class="panel panel-pad"><h2 class="section-title">When to seek care</h2><p class="muted small">For urgent symptoms or immediate danger, contact local emergency services. For personal medical questions, speak with a healthcare professional.</p></section></div></div>`;
  }
  function patientPage() {
    if (page === "rapid") return rapidPage();
    if (page === "doctors") return doctorDirectory();
    if (page === "appointments") return appointmentsPage();
    if (page === "journey") return patientJourney();
    if (page === "records") return patientRecords();
    if (page === "notifications") return patientNotifications();
    if (page === "ai") return aiPage();
    if (page === "challenge") return challengePage();
    if (page === "consult") return consultPage();
    return patientHome();
  }
  function doctorHome() {
    const d=currentDoctor();
    const appts=myAppointments(false);
    const cases=state.cases.filter(c=>c.doctorId===session.id);
    const requests=state.connections.filter(c=>c.doctorId===session.id && c.status==="PENDING");
    const today=new Date().toISOString().slice(0,10);
    const todays=appts.filter(a=>a.date===today && a.status!=="CANCELLED");
    const activeCases=cases.filter(c=>c.status!=="RESOLVED");
    const related=demoPatients.filter(p=>p.doctorId===session.id);
    return `${heading("Doctor workspace", `Welcome, ${esc(d.name)}`, `${esc(d.specialty)} · ${esc(d.id)} · Your own patients, cases and appointment schedule.`, `<span class="badge">${esc(d.specialty)}</span>`)}
      <div class="inline-stats"><div class="stat-tile"><small>Today's appointments</small><strong>${todays.length}</strong><div class="stat-note">Linked to your schedule</div></div><div class="stat-tile"><small>Rapid Assist queue</small><strong>${activeCases.length} active</strong><div class="stat-note">Assigned to ${esc(d.name)}</div></div><div class="stat-tile"><small>Connect requests</small><strong>${requests.length}</strong><div class="stat-note">Awaiting your review</div></div></div>
      <div class="content-grid mt-12"><div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Upcoming consultations</h2><p>Patient and doctor share the same stored Google Meet room.</p></div><button class="btn btn-outline btn-small" data-action="navigate" data-page="appointments">Schedule</button></div>${upcomingAppointment(appts)?appointmentCard(upcomingAppointment(appts),true):emptyState("No appointments on your schedule", "Appointments booked with you appear here when a patient confirms a time.")}</section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Rapid Assist cases</h2><p>Cases routed to your specialty</p></div><button class="btn btn-outline btn-small" data-action="navigate" data-page="cases">Open queue</button></div>${cases.length?cases.slice(0,3).map(caseRow).join(""):emptyState("Your case queue is clear", "New patient handoffs routed to your specialty will appear here.")}</section>
      </div><div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Patient care panel</h2><p>Fictional demo context · no prior records implied</p></div></div>${related.map(p=>`<div class="row-item"><span class="avatar">${p.initials}</span><div class="row-body"><strong>${esc(p.name)}</strong><p>${esc(p.id)} · ${p.age} years · demo directory profile</p></div><span class="badge neutral">Context</span></div>`).join("")}</section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Connect requests</h2><p>Patient requests sent to your doctor account</p></div></div>${requests.length?requests.map(connectionRow).join(""):emptyState("No requests pending", "When a patient requests to connect, review it here.")}</section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Recent updates</h2><p>Relevant to your workspace</p></div></div>${notificationsForUser().slice(0,3).map(notificationRow).join("")||emptyState("No new updates", "Case and appointment activity will appear here.")}</section></div></div>`;
  }
  function caseRow(c) {
    const staffStatus=c.staffStatus||"REQUEST RECEIVED";
    return `<div class="row-item"><span class="row-icon">ϟ</span><div class="row-body"><strong>${esc(c.id)} · ${esc(c.concernCategory)}</strong><p>${esc(c.patientName)} · ${esc(c.patientId)} · ${esc(c.urgency)} · ${esc(staffStatus)}</p></div><button class="btn btn-outline btn-small" data-action="open-case" data-id="${esc(c.id)}">Review</button></div>`;
  }
  function connectionRow(c) {
    const p=state.patients.find(x=>x.id===c.patientId)||{name:"Alex Morgan",id:c.patientId,initials:"AM"};
    return `<div class="row-item"><span class="avatar">${esc(p.initials||initials(p.name))}</span><div class="row-body"><strong>${esc(p.name)}</strong><p>${esc(p.id)} · Connection requested ${stamp(c.createdAt)}</p></div><div class="gap-row"><button class="btn btn-primary btn-small" data-action="accept-connection" data-id="${esc(c.id)}">Accept</button><button class="btn btn-outline btn-small" data-action="decline-connection" data-id="${esc(c.id)}">Decline</button></div></div>`;
  }
  function doctorQueuePage() {
    const cases=state.cases.filter(c=>c.doctorId===session.id);
    return `${heading("Patient queue", "Cases needing your attention.", "Only cases and requests assigned to your clinician account appear here.")}<section class="panel panel-pad"><div class="panel-heading"><div><h2>Rapid Assist handoffs</h2><p>${cases.length} case${cases.length===1?"":"s"} routed to ${esc(currentDoctor().name)}</p></div></div>${cases.length?cases.map(caseRow).join(""):emptyState("No active cases", "Patient handoffs are added here when they select your specialty.", "Review your appointments","navigate","appointments")}</section>
      <section class="panel panel-pad mt-12"><div class="panel-heading"><div><h2>Fictional patient directory</h2><p>Demo context profiles only — not pre-populated clinical records.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Patient</th><th>ID</th><th>Context clinician</th><th>Record status</th></tr></thead><tbody>${demoPatients.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.id)}</td><td>${esc(getDoctor(p.doctorId)?.name||"Care team")}</td><td><span class="badge neutral">No demo history seeded</span></td></tr>`).join("")}</tbody></table></div></section>`;
  }
  function doctorCasesPage() {
    const cases=state.cases.filter(c=>c.doctorId===session.id);
    return `${heading("Rapid Assist", "Clinical-support handoffs.", "Review only the user-provided and explicitly labelled demo information in each saved case.")}<section class="panel panel-pad">${cases.length?cases.map(caseRow).join(""):emptyState("No Rapid Assist cases yet", "A case will appear after a patient chooses to send a clinical-support summary.")}</section>${selectedCaseId?caseDetail(selectedCaseId):""}`;
  }
  function caseDetail(caseId) {
    const c=state.cases.find(x=>x.id===caseId); if(!c)return "";
    return `<section class="panel panel-pad mt-12"><div class="panel-heading"><div><h2>Case ${esc(c.id)}</h2><p>${esc(c.patientName)} · ${esc(c.patientId)} · ${stamp(c.createdAt)}</p></div><span class="badge blue">${esc(c.status)}</span></div><div class="concern-box"><h3>${esc(c.concernCategory)}</h3><p><strong>User-provided concern:</strong> ${esc(c.concern||"No description supplied.")}</p><p><strong>Attachment reference:</strong> ${esc(c.fileName||"None")} · ${esc(c.fileStatus||"No attachment")}</p><p><strong>Available findings:</strong> ${esc(c.findings||UNREADABLE)}</p><p><strong>Routing reason:</strong> ${esc(c.routingReason)}</p><p><strong>Recommended next step:</strong> ${esc(c.nextStep)}</p><p><strong>Staff response:</strong> ${esc(c.staffStatus)}</p>${c.doctorNote?`<p><strong>Clinician note:</strong> ${esc(c.doctorNote)}</p>`:""}</div><div class="field mt-12"><label for="case-note">Add a clinician note</label><textarea id="case-note" placeholder="Document a care coordination note. Do not enter real patient data."></textarea></div><div class="medical-alert mt-12">This recommendation is based on available information and is not a medical diagnosis. Clinical confirmation is required.</div><div class="gap-row mt-12"><button class="btn btn-primary btn-small" data-action="save-case-note" data-id="${esc(c.id)}">Save note</button><button class="btn btn-outline btn-small" data-action="case-reviewed" data-id="${esc(c.id)}">Mark reviewed</button><button class="btn btn-outline btn-small" data-action="case-appointment" data-id="${esc(c.id)}">Recommend appointment</button><button class="btn btn-outline btn-small" data-action="case-close">Close details</button></div></section>`;
  }
  function doctorRequestsPage() {
    const list=state.connections.filter(c=>c.doctorId===session.id);
    return `${heading("Doctor Connect", "Patient connection requests.", "Accepting creates a shared patient–doctor connection visible to both sides.")}<section class="panel panel-pad">${list.length?list.map(connectionRow).join(""):emptyState("No connection requests", "New requests from patients appear here.")}</section>`;
  }
  function doctorAppointmentsPage() {
    const list=myAppointments(false).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    return `${heading("Appointments", "Your consultation schedule.", "Shared bookings and one stored Meet link per appointment.")}<section class="panel panel-pad">${list.length?list.map(a=>appointmentCard(a,true)).join(""):emptyState("No appointments booked", "Appointments created by patients for your account appear here.")}</section>`;
  }
  function doctorRecordsPage() {
    const cases=state.cases.filter(c=>c.doctorId===session.id);
    const mem=state.memories.filter(m=>m.doctorId===session.id);
    const rx=state.prescriptions.filter(p=>p.doctorId===session.id);
    return `${heading("Patient records", "Records connected to your care.", "Records shown here are created by real actions in this local prototype.")}<div class="stack">${panel("Rapid Assist cases",cases.length?cases.map(caseRow).join(""):emptyState("No cases", "Patient summaries you receive appear here."))}${panel("Consultation memories",mem.length?mem.map(m=>`<div class="row-item"><span class="row-icon">▤</span><div class="row-body"><strong>${esc(m.patientName)} · ${esc(m.reason)}</strong><p>${esc(m.summary||m.notes||"No summary entered.")} · ${stamp(m.createdAt)}</p></div></div>`).join(""):emptyState("No consultation memories yet", "End a consultation to create the first memory."))}${panel("Prescriptions",rx.length?rx.map(p=>prescriptionRow(p,false)).join(""):emptyState("No prescriptions issued", "After a patient consultation, create treatment instructions from Treatment & follow-up."))}</div>`;
  }
  function prescriptionRow(p, editable) {
    return `<div class="row-item"><span class="row-icon">＋</span><div class="row-body"><strong>${esc(p.medicine)} · ${esc(p.patientName)}</strong><p>${esc(p.instructions)} · ${esc(p.duration)} · ${dateText(p.createdAt)}</p></div>${editable ? `<select data-action="prescription-status" data-id="${esc(p.id)}" aria-label="Treatment status for ${esc(p.medicine)}">${["TREATMENT IN PROGRESS","FOLLOW-UP DUE","DOCTOR REVIEW","COMPLETED","CONTINUED"].map(s=>`<option ${s===p.status?"selected":""}>${s}</option>`).join("")}</select>` : `<span class="badge blue">${esc(p.status)}</span>`}</div>`;
  }
  function treatmentPage() {
    const rx=state.prescriptions.filter(p=>p.doctorId===session.id);
    const follow=state.followUps.filter(f=>f.doctorId===session.id);
    const patientsWithActivity=[...new Set([...demoPatients.filter(p=>p.doctorId===session.id).map(p=>p.id),...state.appointments.filter(a=>a.doctorId===session.id).map(a=>a.patientId),...state.cases.filter(c=>c.doctorId===session.id).map(c=>c.patientId)])];
    return `${heading("Treatment & follow-up", "Support the next step.", "Create a prescription or follow-up from a patient relationship already present in your workspace.")}<div class="content-grid"><div class="stack">
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Add prescription</h2><p>Saved to the patient record and care journey.</p></div></div><form id="rx-form" data-testid="prescription-form"><div class="field"><label for="rx-patient">Patient</label><select id="rx-patient" name="patientId" required>${patientsWithActivity.map(pid=>`<option value="${esc(pid)}">${esc(state.patients.find(p=>p.id===pid)?.name||"Alex Morgan")} · ${esc(pid)}</option>`).join("")}</select></div><div class="field"><label for="rx-medicine">Medicine / care item</label><input id="rx-medicine" name="medicine" required maxlength="90" placeholder="Enter clinician-directed item"></div><div class="field"><label for="rx-instructions">Instructions</label><textarea id="rx-instructions" name="instructions" required placeholder="Clinician-provided instructions"></textarea></div><div class="form-row"><div class="field"><label for="rx-duration">Duration</label><input id="rx-duration" name="duration" required placeholder="e.g. As discussed"></div><div class="field"><label for="rx-status">Treatment status</label><select id="rx-status" name="status"><option>TREATMENT IN PROGRESS</option><option>FOLLOW-UP DUE</option><option>DOCTOR REVIEW</option><option>COMPLETED</option><option>CONTINUED</option></select></div></div><div class="medical-alert">Prototype record only. Ensure any medication and treatment advice is clinically verified before use.</div><div class="mt-12"><button class="btn btn-primary" type="submit">Save prescription</button></div></form></section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Schedule follow-up</h2><p>Visible to the patient in their dashboard and records.</p></div></div><form id="follow-form"><div class="field"><label for="fu-patient">Patient</label><select id="fu-patient" name="patientId" required>${patientsWithActivity.map(pid=>`<option value="${esc(pid)}">${esc(state.patients.find(p=>p.id===pid)?.name||"Alex Morgan")} · ${esc(pid)}</option>`).join("")}</select></div><div class="form-row"><div class="field"><label for="fu-date">Follow-up date</label><input id="fu-date" name="date" type="date" min="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label for="fu-reason">Reason</label><input id="fu-reason" name="reason" maxlength="120" required placeholder="Review plan"></div></div><button class="btn btn-primary" type="submit">Schedule follow-up</button></form></section></div>
      <div class="stack">${panel("Your prescriptions",rx.length?rx.map(p=>prescriptionRow(p,true)).join(""):emptyState("No prescriptions yet", "Create a prescription after entering a patient relationship."))}${panel("Follow-ups",follow.length?follow.map(f=>`<div class="row-item"><span class="row-icon">↻</span><div class="row-body"><strong>${esc(f.patientName)} · ${dateText(f.date)}</strong><p>${esc(f.reason)} · ${esc(f.status)}</p></div><select data-action="follow-status" data-id="${esc(f.id)}"><option ${f.status==="SCHEDULED"?"selected":""}>SCHEDULED</option><option ${f.status==="COMPLETED"?"selected":""}>COMPLETED</option><option ${f.status==="CONTINUED"?"selected":""}>CONTINUED</option></select></div>`).join(""):emptyState("No follow-ups scheduled", "Schedule one above to continue a patient's care journey."))}</div></div>`;
  }
  function doctorNotifications() {
    const items=notificationsForUser();
    return `${heading("Notifications", "Your shared care updates.", "Case handoffs, connection requests and appointments for your clinician account.")}<section class="panel panel-pad">${items.length?items.map(notificationRow).join(""):emptyState("No new updates", "Relevant patient actions will appear here.")}</section>`;
  }
  function doctorPage() {
    if (page==="queue") return doctorQueuePage();
    if (page==="cases") return doctorCasesPage();
    if (page==="requests") return doctorRequestsPage();
    if (page==="appointments") return doctorAppointmentsPage();
    if (page==="records") return doctorRecordsPage();
    if (page==="treatment") return treatmentPage();
    if (page==="notifications") return doctorNotifications();
    if (page==="consult") return consultPage();
    return doctorHome();
  }
  const staffStatuses=["REQUEST RECEIVED","ACKNOWLEDGED","RESPONDING","WITH PATIENT","RESOLVED"];
  function staffDashboard() {
    const cases=state.cases.slice().sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
    const appointments=state.appointments.filter(a=>a.status!=="CANCELLED").slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const active=cases.filter(c=>c.staffStatus!=="RESOLVED").length;
    return `${heading("Nurse / staff coordination", "Care coordination, at a glance.", "A compact local workspace for Rapid Assist response and appointment readiness.", `<span class="badge">${active} active alert${active===1?"":"s"}</span>`)}
      <div class="inline-stats"><div class="stat-tile"><small>Rapid Assist alerts</small><strong>${cases.length}</strong><div class="stat-note">Shared case records</div></div><div class="stat-tile"><small>Appointments</small><strong>${appointments.length}</strong><div class="stat-note">Coordination queue</div></div><div class="stat-tile"><small>Patient arrivals</small><strong>${appointments.filter(a=>a.patientJoined).length}</strong><div class="stat-note">Patients joined SamCare consult</div></div></div>
      <div class="content-grid mt-12"><div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Rapid Assist alerts</h2><p>REQUEST RECEIVED → ACKNOWLEDGED → RESPONDING → WITH PATIENT → RESOLVED</p></div></div>${cases.length?cases.map(staffAlert).join(""):emptyState("No alerts to coordinate", "New Rapid Assist handoffs will appear here after a patient sends their summary.")}</section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Appointment coordination</h2><p>Meet link and appointment status are shared with assigned clinician.</p></div></div>${appointments.length?appointments.map(a=>appointmentCard(a,true)).join(""):emptyState("No appointment coordination needed", "Bookings requiring coordination will appear here.")}</section></div>
      <div class="stack"><section class="panel panel-pad"><div class="panel-heading"><div><h2>Patient queue</h2><p>Current response state from shared alerts</p></div></div>${cases.length?cases.map(c=>`<div class="row-item"><span class="row-icon">◌</span><div class="row-body"><strong>${esc(c.patientName)}</strong><p>${esc(c.patientId)} · ${esc(c.concernCategory)}</p></div><span class="badge ${c.staffStatus==="RESOLVED"?"":"blue"}">${esc(c.staffStatus||staffStatuses[0])}</span></div>`).join(""):emptyState("Queue is clear", "A patient queue entry appears when a case is submitted.")}</section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Coordination updates</h2><p>Recent staff notifications</p></div></div>${notificationsForUser().slice(0,6).map(notificationRow).join("")||emptyState("No updates yet", "Staff response changes are recorded here.")}</section></div></div>`;
  }
  function staffAlert(c) {
    const current=Math.max(0,staffStatuses.indexOf(c.staffStatus||staffStatuses[0]));
    return `<article class="alert-card"><div class="alert-head"><div><h3>${esc(c.id)} · ${esc(c.concernCategory)}</h3><div class="small muted">${esc(c.patientName)} · ${esc(c.patientId)} · Routed to ${esc(getDoctor(c.doctorId)?.name||"General care")}</div></div><span class="badge ${current===4?"":"blue"}">${esc(staffStatuses[current])}</span></div><div class="alert-track">${staffStatuses.map((s,i)=>`<span class="${i<=current?"on":""}" title="${esc(s)}"></span>`).join("")}</div><div class="alert-actions"><span class="small muted">${esc(c.urgency)} · ${stamp(c.createdAt)}</span><select data-action="staff-status" data-id="${esc(c.id)}" aria-label="Update response status for ${esc(c.id)}">${staffStatuses.map(s=>`<option ${s===staffStatuses[current]?"selected":""}>${s}</option>`).join("")}</select></div></article>`;
  }
  function staffPage() {
    if(page==="alerts") return `${heading("Rapid Assist alerts", "Response status.", "Progress updates are saved to the same shared case patients and doctors can see.")}<section class="panel panel-pad">${state.cases.length?state.cases.map(staffAlert).join(""):emptyState("No alerts received", "Patient Rapid Assist handoffs will be added here.")}</section>`;
    if(page==="appointments") return `${heading("Appointment coordination", "Upcoming visits.", "Bookings created by patients are available to the staff workspace.")}<section class="panel panel-pad">${state.appointments.length?state.appointments.map(a=>appointmentCard(a,true)).join(""):emptyState("No appointments to coordinate", "Patient appointments appear here after booking.")}</section>`;
    if(page==="queue") return `${heading("Patient queue", "Patients in coordination.", "Only current shared Rapid Assist cases are in this response queue.")}<section class="panel panel-pad">${state.cases.length?state.cases.map(staffAlert).join(""):emptyState("Queue is clear", "No patients are waiting for coordination.")}</section>`;
    if(page==="notifications") return `${heading("Notifications", "Coordination updates.", "Notifications are generated from actual actions in this local prototype.")}<section class="panel panel-pad">${notificationsForUser().map(notificationRow).join("")||emptyState("Nothing to report", "New case and appointment activity will appear here.")}</section>`;
    return staffDashboard();
  }
  function consultPage() {
    let c=state.consultations.find(x=>x.id===activeConsultId);
    if(!c && activeConsultId) c=state.consultations.find(x=>x.appointmentId===activeConsultId);
    const a=c ? state.appointments.find(x=>x.id===c.appointmentId) : state.appointments.find(x=>x.id===activeConsultId);
    if (!a && !c) return `${heading("Consultation", "Your SamCare consultation space.", "Open a booked visit to prepare notes and consultation memory.")}<section class="panel panel-pad">${myAppointments(session.role==="patient").length?myAppointments(session.role==="patient").map(x=>appointmentCard(x,session.role==="doctor")).join(""):emptyState("No visit selected", "Book an appointment or open one from your schedule.", session.role==="patient"?"Book appointment":"View appointments","navigate","appointments")}</section>`;
    const appt=a||state.appointments.find(x=>x.id===c.appointmentId);
    if(!c) {
      c={id:id("CONS"),appointmentId:appt.id,patientId:appt.patientId,doctorId:appt.doctorId,status:"SCHEDULED",reason:appt.reason||"General consultation",notes:"",createdAt:new Date().toISOString()};
      state.consultations.push(c); persist();
      activeConsultId=c.id;
    }
    const p=state.patients.find(x=>x.id===c.patientId)||{name:"Alex Morgan",id:"SC-284731"};
    const d=getDoctor(c.doctorId);
    return `${heading("SamCare Consultation Environment", "A shared space for your visit.", "SamCare organizes the visit record. The actual video meeting opens in Google Meet.", `<span class="badge blue">${esc(c.status)}</span>`)}
      <div class="content-grid"><div class="stack"><section class="panel panel-pad"><div class="consult-banner"><span class="eyebrow">SamCare Prototype Consultation Environment</span><h3>${esc(p.name)} & ${esc(d?.name||"Care team")}</h3><p>${esc(p.id)} · ${dateText(appt?.date)} · ${timeText(appt?.time)} · ${esc(c.reason)}</p></div><div class="rule"></div><div class="panel-heading"><div><h2>Meeting status</h2><p>${esc(appointmentStatus(appt||{}))} · shared meeting URL stored with appointment</p></div></div><div class="link-box">${esc(appt?.meetingLink||MEET)}</div><div class="gap-row mt-12">${meetButton(appt)}${c.status!=="COMPLETED"?`<button class="btn btn-outline btn-small" data-action="consult-joined" data-id="${esc(c.id)}">Mark joined</button>`:""}<span class="badge ${c.status==="COMPLETED"?"":"neutral"}">${c.duration ? `Duration ${c.duration} min` : "Duration starts when joined"}</span></div><div class="notice-line">No video is hosted by SamCare. Google Meet is the external meeting destination.</div></section>
      <section class="panel panel-pad"><div class="panel-heading"><div><h2>Consultation notes</h2><p>Notes are saved locally and included in Consultation Memory when ended.</p></div></div><div class="field"><label for="consult-notes">Visit notes</label><textarea id="consult-notes" data-consult="${esc(c.id)}" placeholder="Enter notes from this prototype visit…">${esc(c.notes||"")}</textarea></div><div class="gap-row"><button class="btn btn-outline btn-small" data-action="save-consult-notes" data-id="${esc(c.id)}">Save notes</button>${c.status!=="COMPLETED"?`<button class="btn btn-danger btn-small" data-action="end-consult" data-id="${esc(c.id)}">End consultation & save memory</button>`:"<span class='badge'>Memory saved</span>"}</div></section></div>
      <div class="stack"><section class="panel panel-pad"><h2 class="section-title">Visit details</h2><div class="row-item"><span class="row-icon">◉</span><div class="row-body"><strong>Patient</strong><p>${esc(p.name)} · ${esc(p.id)}</p></div></div><div class="row-item"><span class="row-icon">＋</span><div class="row-body"><strong>Doctor</strong><p>${esc(d?.name||"Care team")} · ${esc(d?.specialty||"")}</p></div></div><div class="row-item"><span class="row-icon">▦</span><div class="row-body"><strong>Appointment</strong><p>${dateText(appt?.date)} at ${timeText(appt?.time)}</p></div></div></section><section class="panel panel-pad"><h2 class="section-title">After your visit</h2><p class="muted small">Ending this session creates a Consultation Memory. Your doctor can then add a prescription and schedule follow-up from their treatment workspace.</p>${session.role==="doctor"?`<button class="btn btn-outline btn-small" data-action="navigate" data-page="treatment">Open treatment & follow-up</button>`:""}</section></div></div>`;
  }
  function landingPage() {
    return `<div class="landing"><nav class="landing-nav"><a class="brand" href="#" data-action="go-home">${brand()}</a><div class="nav-note">A local competition prototype · fictional demo records</div><button class="btn btn-outline btn-small" data-action="login-screen">Sign in</button></nav>
      <main class="landing-main"><div><div class="eyebrow">Powered by SamCare AI · Connected care</div><h1>One patient.<br><em>One connected</em><br>healthcare journey.</h1><p class="landing-lede">From urgent support to everyday care, SamCare connects patients, doctors and hospital staff through one continuous healthcare journey.</p><div class="landing-actions"><button class="btn btn-primary" data-action="login-screen" data-testid="enter-samcare">Enter SamCare <span>→</span></button><button class="btn btn-quiet" data-action="explore-rapid" data-testid="explore-rapid">Explore Rapid Assist</button></div><div class="small muted">Local-only demo · Your records stay in this browser</div></div>
      <div class="landing-illustration" aria-label="Illustration of a connected patient care journey"><div class="hero-orbit one"></div><div class="hero-orbit two"></div><div class="hero-panel"><div class="hero-panel-top"><a class="brand">${brand()}</a><span class="status-dot">CARE, CONNECTED</span></div><div class="hero-assist"><div class="eyebrow">Rapid Assist</div><h2>From first concern to thoughtful care.</h2></div><div class="small muted">A connected path, guided by people</div><div class="journey-mini"><span><i></i>Share concern</span><span><i></i>Match care</span><span><i></i>Meet doctor</span><span><i></i>Follow up</span></div></div></div></main>
      <div class="landing-proof"><span><strong>Patient</strong> · personal care view</span><span><strong>Doctor</strong> · specialty-matched workspace</span><span><strong>Nurse / Staff</strong> · response coordination</span><span>Demo authentication is not production security</span></div></div>`;
  }
  function loginPage() {
    const demoPassword=loginRole==="patient"?"Patient@123":loginRole==="staff"?"Staff@123":"Use the password shown for the selected doctor";
    return `<div class="login-screen"><aside class="login-story"><a class="brand" href="#" data-action="go-home">${brand()}</a><div><div class="eyebrow" style="color:#a8d6d2">Welcome to SamCare</div><h1>Care moves better when it moves together.</h1><p>One connected place for the patient, their doctor and the care team around them.</p></div><div class="login-story-foot">Local demo authentication · Insecure by design · Fictional records only</div></aside><main class="login-side"><section class="login-card"><div class="eyebrow">Secure your demo session</div><h2>Sign in to SamCare</h2><p>Choose one of the three portal types. This prototype stores session details locally.</p><div class="assist-options" role="tablist" aria-label="Portal type">${[["patient","Patient"],["doctor","Doctor"],["staff","Nurse / Staff"]].map(([r,n])=>`<button class="choice ${loginRole===r?"selected":""}" data-action="login-role" data-role="${r}" role="tab" aria-selected="${loginRole===r}">${n}</button>`).join("")}</div><form id="login-form" data-testid="login-form"><div class="field"><label for="login-id">${loginRole==="patient"?"Patient name or ID":loginRole==="doctor"?"Doctor ID":"Staff ID"}</label><input id="login-id" autocomplete="username" placeholder="${loginRole==="patient"?"Alex Morgan or SC-284731":loginRole==="doctor"?"DOC-SR001":"STAFF-001"}" required data-testid="login-id"></div><div class="field"><label for="login-password">Demo password</label><input id="login-password" type="password" autocomplete="current-password" placeholder="${esc(demoPassword)}" required data-testid="login-password"></div><button class="btn btn-primary btn-block" type="submit" data-testid="login-submit">Continue to ${loginRole==="staff"?"Nurse / Staff":loginRole[0].toUpperCase()+loginRole.slice(1)} portal</button><div class="login-error" id="login-error" role="alert"></div></form><div class="demo-note"><strong>Competition demo credentials</strong><div class="demo-credentials"><span>Patient: Alex Morgan / SC-284731 · <strong>Patient@123</strong></span><span>Doctor DOC-SR001 / SamCare@001 · DOC-RR002 / SamCare@002</span><span>Doctor DOC-VR003 / SamCare@003 · DOC-AM004 / SamCare@004</span><span>Nurse / Staff STAFF-001 · <strong>Staff@123</strong></span></div><div style="margin-top:8px"><strong>Insecure demo-only authentication.</strong> Do not use real patient information or passwords.</div></div><button class="btn btn-quiet btn-small mt-12" data-action="go-home">Back to welcome</button></section></main></div>`;
  }
  function render() {
    if (!app) return;
    if (!session) app.innerHTML = page === "login" ? loginPage() : landingPage();
    else {
      const content = session.role === "patient" ? patientPage() : session.role === "doctor" ? doctorPage() : staffPage();
      app.innerHTML = shell(content);
    }
  }
  function login(idValue, password) {
    const normalized=(idValue||"").trim().toLowerCase();
    const user=state.users.find(u => (u.id.toLowerCase()===normalized || u.name.toLowerCase()===normalized) && u.password===password);
    if(!user) return false;
    page=enterRapidAfterLogin && user.role==="patient" ? "rapid" : "home";
    enterRapidAfterLogin=false;
    saveSession({id:user.id,role:user.role,name:user.name}); return true;
  }
  function goPage(next) {
    if (next === "cases" && session.role !== "doctor") next = "home";
    if (next === "requests" && session.role !== "doctor") next = "home";
    if (next === "treatment" && session.role !== "doctor") next = "home";
    page=next || "home"; mobileNavOpen=false; render(); window.scrollTo(0,0);
  }
  function routeDoctor(mode, concern, fixture) {
    const text=(concern||"").toLowerCase();
    if (mode==="injury") return { doctorId:"DOC-RR002", categoryTitle:"MUSCULOSKELETAL EVALUATION RECOMMENDED", routingReason:"Injury concern selected by the patient; orthopedic evaluation may be appropriate.", nextStep:"Clinical evaluation recommended.", urgency:"PRIORITY" };
    if (mode==="report" && fixture) return { doctorId:"DOC-SR001", categoryTitle:"CARDIOVASCULAR EVALUATION RECOMMENDED", routingReason:"The selected, explicitly labelled sample report fixture contains cardiovascular-related demo values; this is not a diagnosis.", nextStep:"These findings may warrant cardiovascular evaluation. Verify the report with a healthcare professional.", urgency:"PRIORITY" };
    if (mode==="general" && /(headache|numb|tingl|memory|seiz|balance|migraine|neurolog)/.test(text)) return { doctorId:"DOC-VR003", categoryTitle:"NEUROLOGICAL EVALUATION RECOMMENDED", routingReason:"The user-provided concern mentions symptoms for which neurological evaluation may be appropriate; clinician confirmation is needed.", nextStep:"Discuss the concern with a healthcare professional.", urgency:"PRIORITY" };
    if (mode==="general" && /(chest|heart|blood pressure|palpitat|cholesterol|breathless)/.test(text)) return { doctorId:"DOC-SR001", categoryTitle:"CARDIOVASCULAR EVALUATION RECOMMENDED", routingReason:"The user-provided concern mentions cardiovascular-related information that may warrant professional evaluation.", nextStep:"Discuss these concerns with a healthcare professional; seek emergency care for severe or sudden symptoms.", urgency:"PRIORITY" };
    if (mode==="emergency") return { doctorId:"", categoryTitle:"URGENT PROFESSIONAL SUPPORT", routingReason:"Emergency support selected. Rapid Assist cannot assess or respond to emergencies.", nextStep:"Contact your local emergency number or go to the nearest emergency department now.", urgency:"URGENT" };
    if (mode==="report") return { doctorId:"", categoryTitle:"GENERAL CLINICAL ASSESSMENT RECOMMENDED", routingReason:"No demo fixture selected and the uploaded file is not interpreted in local demo mode.", nextStep:"Please verify the report with a healthcare professional.", urgency:"ROUTINE" };
    if (mode==="general") return { doctorId:"DOC-AM004", categoryTitle:"GENERAL CLINICAL ASSESSMENT RECOMMENDED", routingReason:"No specific specialty can be determined from the user-provided information.", nextStep:"A general clinical assessment may help identify an appropriate next step.", urgency:"ROUTINE" };
    return { doctorId:"", categoryTitle:"GENERAL CLINICAL ASSESSMENT RECOMMENDED", routingReason:"No specialty can be confidently determined from available information.", nextStep:"Please select a clinician from the doctor directory or contact your healthcare professional.", urgency:"ROUTINE" };
  }
  function startAnalysis() {
    if (scanTimer) clearInterval(scanTimer);
    const concern=document.getElementById("concern")?.value||"";
    const fixture=document.getElementById("fixture")?.value||"";
    const route=routeDoctor(rapidMode,concern,fixture);
    rapidDraft=Object.assign({mode:rapidMode,concern,fixture,createdAt:new Date().toISOString(),sent:false,fileName:rapidFile?.name||"",fileStatus:rapidFile?"Attached for reference only; not interpreted":"No attachment"},route);
    rapidStage=0; render();
    let next=1;
    scanTimer=setInterval(()=>{
      rapidStage=next; next++;
      if(next>8) { clearInterval(scanTimer);scanTimer=null; }
      render();
    },380);
  }
  function sendSummary() {
    if (!rapidDraft || rapidDraft.sent) return;
    const d=getDoctor(rapidDraft.doctorId);
    const c={
      id:id("RA"),patientId:"SC-284731",patientName:"Alex Morgan",doctorId:rapidDraft.doctorId||"",createdAt:new Date().toISOString(),
      mode:rapidDraft.mode,concern:rapidDraft.concern,concernCategory:rapidDraft.categoryTitle,urgency:rapidDraft.urgency,
      routingReason:rapidDraft.routingReason,nextStep:rapidDraft.nextStep,fileName:rapidFile?.name||"",
      fileStatus:rapidFile?"Attachment available as a reference only; no OCR or image interpretation performed.":"No attachment provided.",
      findings:rapidDraft.mode==="report"&&!rapidDraft.fixture?UNREADABLE:rapidDraft.fixture==="bp"?"DEMO FIXTURE ONLY — Blood pressure 146/92 mmHg; fixture reference <120/80 mmHg; outside provided range. Not extracted from uploaded file.":rapidDraft.fixture==="lipid"?"DEMO FIXTURE ONLY — LDL cholesterol 162 mg/dL; fixture reference <100 mg/dL; outside provided range. Not extracted from uploaded file.":"User-provided description only; uploaded image was not interpreted.",
      status:"NEW",staffStatus:"REQUEST RECEIVED"
    };
    state.cases.unshift(c);
    addNotification("patient","Rapid Assist summary sent",d?`${d.name} received case ${c.id}.`:`Care coordination received case ${c.id}.`,c.id);
    if(d) addNotification(d.id,"New Rapid Assist case",`${c.patientName} · ${c.concernCategory} · ${c.id}`,c.id);
    addNotification("staff","Rapid Assist alert received",`${c.patientName} · ${c.concernCategory} · ${c.id}`,c.id);
    addJourney("Rapid Assist",`${c.concernCategory} · ${c.id}`,c.id);
    if(d) addJourney("Doctor match",`${d.name} · ${d.specialty}`,c.id);
    persist(); rapidDraft.sent=true;rapidDraft.caseId=c.id;render();toast(`Clinical-support summary saved. Case ${c.id} is now shared.`);
  }
  function requestConnection(doctorId) {
    if(!doctorId)return;
    const existing=state.connections.find(c=>c.patientId==="SC-284731"&&c.doctorId===doctorId);
    if(existing) { toast(existing.status==="ACCEPTED"?"You are already connected.":"Your request is already pending.");return; }
    const d=getDoctor(doctorId);
    const c={id:id("CON"),patientId:"SC-284731",doctorId,status:"PENDING",createdAt:new Date().toISOString()};
    state.connections.unshift(c);addNotification("patient","Doctor connection requested",`Your request was sent to ${d.name}.`,c.id);addNotification(doctorId,"Patient connection request","Alex Morgan has requested to connect.",c.id);addJourney("Doctor connect","Request sent to "+d.name,c.id);persist();toast(`Connection request sent to ${d.name}.`);render();
  }
  function makeAppointment(form) {
    const doctorId=form.get("doctorId"), date=form.get("date"),time=form.get("time");
    if(!doctorId||!date||!time){toast("Choose a doctor, date and time.",true);return;}
    if(new Date(date+"T"+time)<new Date()){toast("Choose a future appointment time.",true);return;}
    const d=getDoctor(doctorId);
    const a={id:id("APT"),patientId:"SC-284731",patientName:"Alex Morgan",doctorId,date,time,status:"CONFIRMED",consultationType:"Online consultation",meetingLink:MEET,reason:form.get("reason")||"",caseId:form.get("caseId")||"",createdAt:new Date().toISOString()};
    state.appointments.unshift(a);
    addNotification("patient","Appointment confirmed",`${d.name} · ${dateText(date)} at ${timeText(time)}. Your shared Meet room is attached.`,a.id);
    addNotification(doctorId,"New appointment",`Alex Morgan · ${dateText(date)} at ${timeText(time)}.`,a.id);
    addNotification("staff","Appointment coordination",`Alex Morgan with ${d.name} · ${dateText(date)} at ${timeText(time)}.`,a.id);
    addJourney("Appointment",`${d.name} · ${dateText(date)} at ${timeText(time)}`,a.id);
    const connection=state.connections.find(c=>c.patientId==="SC-284731"&&c.doctorId===doctorId);
    if(!connection) state.connections.unshift({id:id("CON"),patientId:"SC-284731",doctorId,status:"PENDING",createdAt:new Date().toISOString(),source:"appointment"});
    persist();rapidDraft=null;rapidStage=-1;page="appointments";render();toast("Appointment confirmed. The shared Google Meet link is attached.");
  }
  function updateStaffStatus(caseId,status) {
    const c=state.cases.find(x=>x.id===caseId); if(!c||!staffStatuses.includes(status))return;
    c.staffStatus=status;c.updatedAt=new Date().toISOString();
    addNotification("patient","Care team response updated",`Your Rapid Assist case ${c.id} is now ${status}.`,c.id);
    if(c.doctorId)addNotification(c.doctorId,"Staff response updated",`Case ${c.id} is now ${status}.`,c.id);
    addJourney("Staff response",`${c.id} · ${status}`,c.id);persist();render();toast(`Response status updated: ${status.toLowerCase()}.`);
  }
  function startConsultation(appointmentId) {
    const a=state.appointments.find(x=>x.id===appointmentId); if(!a)return;
    let c=state.consultations.find(x=>x.appointmentId===appointmentId);
    if(!c) {
      c={id:id("CONS"),appointmentId:a.id,patientId:a.patientId,doctorId:a.doctorId,status:"SCHEDULED",reason:a.reason||"General consultation",notes:"",createdAt:new Date().toISOString()};
      state.consultations.unshift(c);
      addJourney("Consultation","SamCare consultation space opened",c.id);
      persist();
    }
    activeConsultId=c.id;page="consult";render();
  }
  function endConsultation(consultId) {
    const c=state.consultations.find(x=>x.id===consultId); if(!c||c.status==="COMPLETED")return;
    c.status="COMPLETED";c.endedAt=new Date().toISOString();
    const a=state.appointments.find(x=>x.id===c.appointmentId); if(a)a.status="COMPLETED";
    const p=state.patients.find(x=>x.id===c.patientId)||{name:"Alex Morgan"};
    c.durationMinutes=c.startedAt?Math.max(1,Math.round((Date.now()-new Date(c.startedAt).getTime())/60000)):0;
    const memory={id:id("MEM"),appointmentId:c.appointmentId,consultationId:c.id,patientId:c.patientId,patientName:p.name,doctorId:c.doctorId,reason:c.reason,summary:c.notes||"Consultation completed. No additional summary was entered.",notes:c.notes||"",prescription:"",followUp:"",durationMinutes:c.durationMinutes,status:"COMPLETED",createdAt:new Date().toISOString()};
    state.memories.unshift(memory);addNotification("patient","Consultation completed","A Consultation Memory is now available in your records.",memory.id);addNotification(c.doctorId,"Consultation memory saved",`${p.name} · ${c.reason}`,memory.id);addJourney("Consultation memory",memory.summary,memory.id);persist();toast("Consultation ended. Consultation Memory saved.");render();
  }
  function savePrescription(form) {
    const pid=form.get("patientId");const p=state.patients.find(x=>x.id===pid)||{id:pid,name:"Alex Morgan"};
    const rx={id:id("RX"),patientId:pid,patientName:p.name,doctorId:session.id,medicine:form.get("medicine"),instructions:form.get("instructions"),duration:form.get("duration"),status:form.get("status"),createdAt:new Date().toISOString()};
    state.prescriptions.unshift(rx);addNotification(pid==="SC-284731"?"patient":pid,"Prescription added",`${currentDoctor().name} added a treatment record.`,rx.id);addJourney("Prescription",`${rx.medicine} · ${rx.status}`,rx.id);
    const mem=state.memories.find(m=>m.patientId===pid&&m.doctorId===session.id);if(mem)mem.prescription=rx.medicine;
    persist();toast("Prescription saved to the shared local record.");render();
  }
  function saveFollowUp(form) {
    const pid=form.get("patientId");const p=state.patients.find(x=>x.id===pid)||{id:pid,name:"Alex Morgan"};
    const f={id:id("FU"),patientId:pid,patientName:p.name,doctorId:session.id,date:form.get("date"),reason:form.get("reason"),status:"SCHEDULED",createdAt:new Date().toISOString()};
    state.followUps.unshift(f);addNotification(pid==="SC-284731"?"patient":pid,"Follow-up scheduled",`${dateText(f.date)} · ${f.reason}`,f.id);addJourney("Follow-up",`${dateText(f.date)} · ${f.reason}`,f.id);
    const mem=state.memories.find(m=>m.patientId===pid&&m.doctorId===session.id);if(mem)mem.followUp=`${dateText(f.date)} · ${f.reason}`;
    persist();toast("Follow-up scheduled and shared with the patient.");render();
  }
  function localAnswer(question) {
    const q=question.toLowerCase();
    if(/appointment|book|meet|consult/.test(q)) return "To book: open Appointments, select a doctor, choose a future date and an available time, then confirm. Your appointment stores the shared Google Meet room. SamCare itself does not host video.";
    if(/journey|care journey|progress|case/.test(q)) {
      const count=state.journey.filter(e=>e.patientId==="SC-284731").length;
      return `Your Care Journey has ${count} recorded event${count===1?"":"s"} on this device. Open My Care Journey to see Rapid Assist, connections, appointments and treatment records that you have actually created.`;
    }
    if(/prescription|medicine|medication/.test(q)) return "Open Records to review a prescription saved by your clinician. Follow only instructions confirmed by your healthcare professional; SamCare AI cannot recommend a medicine or change a dose.";
    if(/doctor|connect|specialist/.test(q)) return "Open Doctor Connect to review the four fictional demo clinician profiles. Choose Connect to send a request or Book appointment to choose a date and time.";
    if(/report|blood|file|upload|scan|injury/.test(q)) return `Rapid Assist in this local demo does not interpret uploaded files or images. Any user-selected demo fixture is explicitly labelled and is not extracted from your report. ${UNREADABLE}`;
    if(/emergency|urgent|chest pain|stroke/.test(q)) return "If this may be an emergency or symptoms are severe or sudden, contact your local emergency number or visit the nearest emergency department now. This demo is not monitored and cannot triage an emergency.";
    if(/term|reference range|clinical/.test(q)) return "A reference range is the interval a laboratory supplies for a test. Ranges depend on the lab and context; ask a healthcare professional to interpret your results rather than relying on a demo.";
    return "I can help with SamCare navigation, appointments, records or general health information. For personal symptoms, reports or treatment questions, consult a healthcare professional. SamCare AI is a local rule-based demo, not a clinician.";
  }
  function answerQuiz(index) {
    const q=quiz[state.challenge.answered.length%quiz.length];
    if(state.challenge.answered.includes(q.question)){toast("You have already answered this question.");return;}
    state.challenge.answered.push(q.question);
    if(Number(index)===q.correct){state.challenge.score++;quizFeedback="That's right. "+q.fact;}
    else quizFeedback="Not quite. "+q.fact;
    persist();render();
  }
  function handleClick(e) {
    const button=e.target.closest("[data-action]");
    if(!button)return;
    const action=button.dataset.action;
    if(action==="go-home"){e.preventDefault();page="home";if(!session)page="landing";render();return;}
    if(action==="login-screen"){page="login";render();return;}
    if(action==="explore-rapid"){page="login";loginRole="patient";enterRapidAfterLogin=true;render();return;}
    if(action==="login-role"){loginRole=button.dataset.role;render();return;}
    if(action==="logout"){saveSession(null);page="landing";render();return;}
    if(action==="navigate"){goPage(button.dataset.page);return;}
    if(action==="toggle-menu"){mobileNavOpen=!mobileNavOpen;render();return;}
    if(action==="rapid-mode"){rapidMode=button.dataset.mode;rapidDraft=null;rapidStage=-1;rapidConcern="";rapidFixture="";render();return;}
    if(action==="remove-file"){rapidFile=null;if(rapidPreviewUrl)URL.revokeObjectURL(rapidPreviewUrl);rapidPreviewUrl="";render();return;}
    if(action==="start-analysis"){startAnalysis();return;}
    if(action==="reset-rapid"){rapidDraft=null;rapidStage=-1;rapidFile=null;rapidConcern="";rapidFixture="";if(rapidPreviewUrl)URL.revokeObjectURL(rapidPreviewUrl);rapidPreviewUrl="";render();return;}
    if(action==="send-summary"){sendSummary();return;}
    if(action==="edit-concern"){document.getElementById("concern")?.focus();return;}
    if(action==="connect-doctor"){requestConnection(button.dataset.doctor);return;}
    if(action==="book-doctor"){page="appointments";render();const sel=document.getElementById("book-doctor");if(sel)sel.value=button.dataset.doctor||"";const c=button.dataset.case;if(c){const hidden=document.getElementById("book-case");if(hidden)hidden.value=c;}window.scrollTo(0,0);return;}
    if(action==="open-consult"){startConsultation(button.dataset.appointment);return;}
    if(action==="join-meet"){const a=state.appointments.find(x=>x.id===button.dataset.appointment);if(a){if(session.role==="patient"){a.patientJoined=true;}else if(session.role==="doctor"){a.doctorReady=true;}persist();}return;}
    if(action==="cancel-appointment"){const a=state.appointments.find(x=>x.id===button.dataset.id);if(a){a.status="CANCELLED";persist();toast("Appointment cancelled.");render();}return;}
    if(action==="record-tab"){selectedRecordTab=button.dataset.tab;render();return;}
    if(action==="answer-quiz"){answerQuiz(button.dataset.answer);return;}
    if(action==="next-quiz"){quizFeedback="";render();return;}
    if(action==="ai-prompt"){const text=button.dataset.prompt;chatHistory.push({who:"user",text},{who:"ai",text:localAnswer(text)});render();return;}
    if(action==="open-case"){selectedCaseId=button.dataset.id;page="cases";render();return;}
    if(action==="case-reviewed"){const c=state.cases.find(x=>x.id===button.dataset.id);if(c){c.status="REVIEWED";c.reviewedAt=new Date().toISOString();addNotification("patient","Rapid Assist case reviewed",`${currentDoctor().name} reviewed case ${c.id}.`,c.id);persist();toast("Case marked reviewed.");render();}return;}
    if(action==="save-case-note"){const c=state.cases.find(x=>x.id===button.dataset.id);if(c){c.doctorNote=document.getElementById("case-note")?.value||"";c.noteUpdatedAt=new Date().toISOString();addNotification("patient","Doctor added a case note",`${currentDoctor().name} added a note to case ${c.id}.`,c.id);persist();toast("Clinician note saved to the shared case.");render();}return;}
    if(action==="case-appointment"){const c=state.cases.find(x=>x.id===button.dataset.id);if(c){addNotification("patient","Appointment recommended",`${currentDoctor().name} recommends booking an appointment for case ${c.id}.`,c.id);persist();if(confirm("Open appointment schedule for this patient? This demo books from the patient portal.")){page="home";toast("The patient can book from their Appointments page.");render();}}return;}
    if(action==="case-close"){selectedCaseId="";render();return;}
    if(action==="accept-connection"||action==="decline-connection"){const c=state.connections.find(x=>x.id===button.dataset.id);if(c){c.status=action==="accept-connection"?"ACCEPTED":"DECLINED";c.updatedAt=new Date().toISOString();addNotification("patient",c.status==="ACCEPTED"?"Doctor connection accepted":"Connection request declined",`${currentDoctor().name} ${c.status==="ACCEPTED"?"accepted":"declined"} your request.`,c.id);if(c.status==="ACCEPTED")addJourney("Doctor connect",`${currentDoctor().name} accepted your connection`,c.id);persist();toast(c.status==="ACCEPTED"?"Connection accepted.":"Request declined.");render();}return;}
    if(action==="consult-joined"){const c=state.consultations.find(x=>x.id===button.dataset.id);if(c){c.status="IN_PROGRESS";c.startedAt=c.startedAt||new Date().toISOString();const a=state.appointments.find(x=>x.id===c.appointmentId);if(a){if(session.role==="patient")a.patientJoined=true;else a.doctorReady=true;}persist();toast("Consultation status updated in shared local records.");render();}return;}
    if(action==="save-consult-notes"){const c=state.consultations.find(x=>x.id===button.dataset.id);if(c){c.notes=document.getElementById("consult-notes")?.value||"";c.updatedAt=new Date().toISOString();persist();toast("Consultation notes saved.");}return;}
    if(action==="end-consult"){endConsultation(button.dataset.id);return;}
  }
  function handleSubmit(e) {
    e.preventDefault();
    const form=e.target;
    if(form.id==="login-form"){
      const ok=login(document.getElementById("login-id").value,document.getElementById("login-password").value);
      if(!ok){const error=document.getElementById("login-error");if(error)error.textContent="Those demo credentials did not match. Check the examples below.";return;}
      return;
    }
    if(form.id==="booking-form"){
      makeAppointment(new FormData(form));return;
    }
    if(form.id==="rx-form"){savePrescription(new FormData(form));return;}
    if(form.id==="follow-form"){saveFollowUp(new FormData(form));return;}
    if(form.id==="chat-form"){
      const input=document.getElementById("chat-question");const value=input.value.trim();if(!value)return;
      chatHistory.push({who:"user",text:value},{who:"ai",text:localAnswer(value)});render();const win=document.getElementById("chat-window");if(win)win.scrollTop=win.scrollHeight;return;
    }
  }
  function handleChange(e) {
    const el=e.target;
    if(el.id==="fixture"){rapidFixture=el.value;return;}
    if(el.matches('input[type="file"][data-testid="rapid-upload"]')){
      const file=el.files&&el.files[0];if(!file)return;
      if(file.size>12*1024*1024){toast("Choose a file smaller than 12 MB for this local preview.",true);el.value="";return;}
      rapidFile=file;
      if(rapidPreviewUrl)URL.revokeObjectURL(rapidPreviewUrl);
      rapidPreviewUrl=file.type.startsWith("image/")?URL.createObjectURL(file):"";
      render();return;
    }
    if(el.dataset.action==="staff-status"){updateStaffStatus(el.dataset.id,el.value);return;}
    if(el.dataset.action==="follow-status"){
      const f=state.followUps.find(x=>x.id===el.dataset.id);if(f){f.status=el.value;f.updatedAt=new Date().toISOString();addJourney("Follow-up updated",`${dateText(f.date)} · ${f.status}`,f.id);persist();toast("Follow-up status updated.");render();}return;
    }
    if(el.dataset.action==="prescription-status"){
      const p=state.prescriptions.find(x=>x.id===el.dataset.id);if(p){p.status=el.value;p.updatedAt=new Date().toISOString();addJourney("Treatment status updated",`${p.medicine} · ${p.status}`,p.id);addNotification(p.patientId==="SC-284731"?"patient":p.patientId,"Treatment status updated",`${p.medicine} · ${p.status}`,p.id);persist();toast("Treatment status updated.");render();}return;
    }
  }
  app.addEventListener("click",handleClick);
  app.addEventListener("submit",handleSubmit);
  app.addEventListener("change",handleChange);
  app.addEventListener("input",e=>{
    if(e.target.id==="concern") rapidConcern=e.target.value;
    if(e.target.matches("[data-consult]")) {
      const c=state.consultations.find(x=>x.id===e.target.dataset.consult);if(c){c.notes=e.target.value;persist();}
    }
  });
  window.addEventListener("storage",e=>{
    if(e.key===STORE || (e.key||"").startsWith("samcare.v1.")){state=loadState();render();toast("Shared SamCare records refreshed from another tab.");}
    if(e.key==="samcare.session"){session=loadSession();render();}
  });
  window.addEventListener("beforeunload",()=>{if(rapidPreviewUrl)URL.revokeObjectURL(rapidPreviewUrl);});
  render();
})();