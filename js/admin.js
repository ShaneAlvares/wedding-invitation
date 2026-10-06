const SESSION_KEY = "si-admin";
const gate = document.getElementById("gate");
const registry = document.getElementById("registry");
const gateForm = document.getElementById("gate-form");
const gateError = document.getElementById("gate-error");
const passcodeInput = document.getElementById("passcode");
const list = document.getElementById("guest-list");
const searchInput = document.getElementById("search");
const modeBanner = document.getElementById("mode-banner");
const modal = document.getElementById("confirm-modal");
const modalCopy = document.getElementById("confirm-copy");

let code = "";
let items = [];
let shared = false;
let sheet = false;
let filter = "all";
let pendingId = "";

function showGate(message) {
  registry.hidden = true;
  gate.hidden = false;
  gateError.hidden = !message;
  gateError.textContent = message || "";
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    /* ignore */
  }
}

function matches(item, query) {
  if (!query) return true;
  const haystack = [item.name, item.companion, item.email, item.note, item.courseName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function line(label, value) {
  if (!value) return null;
  const paragraph = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = label + " ";
  paragraph.append(strong, document.createTextNode(value));
  return paragraph;
}

function guestCard(item) {
  const details = document.createElement("details");
  details.className = "guest";
  const summary = document.createElement("summary");
  summary.className = "guest-main";
  const copy = document.createElement("div");
  const name = document.createElement("h3");
  name.className = "guest-name";
  name.textContent = item.name;
  const meta = document.createElement("p");
  meta.className = "guest-meta";
  const bits = [];
  if (item.attending) {
    const seats = Number(item.partySize) || 1;
    bits.push(seats === 1 ? "1 seat" : seats + " seats");
    if (item.companion) bits.push("with " + item.companion);
    if (item.courseName) bits.push(item.courseName);
  } else {
    bits.push("Unable to attend");
  }
  const when = formatWhen(item.updatedAt || item.createdAt);
  if (when) bits.push(when);
  meta.textContent = bits.join(" · ");
  copy.append(name, meta);
  const stamp = document.createElement("span");
  stamp.className = "stamp " + (item.attending ? "yes" : "no");
  stamp.textContent = item.attending ? "Confirmed" : "Not participating";
  summary.append(copy, stamp);

  const body = document.createElement("div");
  body.className = "guest-body";
  const rows = [
    line("Email", item.email),
    line("Guest", item.companion),
    line("Course", item.courseName),
    line("Dietary", Array.isArray(item.dietary) && item.dietary.length ? item.dietary.join(", ") : ""),
    line("Shuttle", item.transport ? "Requested" : ""),
    line("Song", item.song),
    line("Note", item.note),
  ].filter(Boolean);
  rows.forEach((row) => body.append(row));
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.textContent = "No extra notes were left with this reply.";
    body.append(empty);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "text-button";
  remove.textContent = "Remove reply";
  remove.addEventListener("click", () => openRemove(item));
  body.append(remove);
  details.append(summary, body);
  return details;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = items.filter((item) => matches(item, query));
  const confirmed = visible.filter((item) => item.attending);
  const declined = visible.filter((item) => !item.attending);
  const allConfirmed = items.filter((item) => item.attending);
  document.getElementById("count-yes").textContent = String(allConfirmed.length);
  document.getElementById("count-no").textContent = String(items.length - allConfirmed.length);
  document.getElementById("count-seats").textContent = String(
    allConfirmed.reduce((sum, item) => sum + (Number(item.partySize) || 1), 0)
  );

  list.replaceChildren();
  const groups =
    filter === "yes"
      ? [["Confirmed", confirmed]]
      : filter === "no"
        ? [["Not participating", declined]]
        : [
            ["Confirmed", confirmed],
            ["Not participating", declined],
          ];

  groups.forEach(([title, group]) => {
    const heading = document.createElement("h2");
    heading.className = "group-title";
    heading.textContent = title;
    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = String(group.length);
    heading.append(count);
    list.append(heading);
    if (!group.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent =
        title === "Confirmed" ? "No one has confirmed yet." : "No regrets have been sent.";
      list.append(empty);
      return;
    }
    group
      .slice()
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .forEach((item) => list.append(guestCard(item)));
  });

  modeBanner.textContent = sheet
    ? "Every reply is saved in the Google Sheet."
    : shared
      ? "Every reply sent through this website is collected here."
      : "These replies are saved only in this browser. Run python3 server.py and share that address so guests on other phones are included.";
}

async function unlock(nextCode) {
  gateError.hidden = true;
  const result = await Store.list(nextCode);
  code = nextCode;
  items = result.items;
  shared = result.shared;
  sheet = Boolean(result.sheet);
  try {
    sessionStorage.setItem(SESSION_KEY, nextCode);
  } catch (error) {
    /* ignore */
  }
  gate.hidden = true;
  registry.hidden = false;
  render();
}

function openRemove(item) {
  pendingId = item.id;
  modalCopy.textContent = "Remove " + item.name + " from the registry?";
  modal.hidden = false;
}

gateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const next = passcodeInput.value.trim();
  if (!next) return;
  const button = gateForm.querySelector("button");
  button.disabled = true;
  try {
    await unlock(next);
  } catch (error) {
    if (error.code === "passcode") showGate("That passcode does not match the seal.");
    else showGate(error.message || "The registry could not be opened.");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("lock").addEventListener("click", () => {
  code = "";
  passcodeInput.value = "";
  showGate("");
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    render();
  });
});

searchInput.addEventListener("input", render);

document.getElementById("export").addEventListener("click", () => {
  const headers = ["Name", "Email", "Status", "Seats", "Companion", "Course", "Dietary", "Shuttle", "Song", "Note", "Submitted"];
  const escape = (value) => '"' + String(value == null ? "" : value).replaceAll('"', '""') + '"';
  const rows = items.map((item) =>
    [
      item.name,
      item.email,
      item.attending ? "Confirmed" : "Not participating",
      item.partySize || 0,
      item.companion,
      item.courseName,
      Array.isArray(item.dietary) ? item.dietary.join("; ") : "",
      item.transport ? "Yes" : "",
      item.song,
      item.note,
      item.updatedAt || item.createdAt,
    ]
      .map(escape)
      .join(",")
  );
  const file = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wedding-rsvps.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("confirm-no").addEventListener("click", () => {
  modal.hidden = true;
  pendingId = "";
});

document.getElementById("confirm-yes").addEventListener("click", async () => {
  if (!pendingId) return;
  try {
    await Store.remove(pendingId, code);
    items = items.filter((item) => item.id !== pendingId);
    pendingId = "";
    modal.hidden = true;
    render();
  } catch (error) {
    modal.hidden = true;
    modeBanner.textContent = error.message || "Could not remove that reply.";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") modal.hidden = true;
});

try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) {
    unlock(saved).catch(() => showGate(""));
  }
} catch (error) {
  /* storage unavailable */
}
