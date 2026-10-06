function applyWedding() {
  document.querySelectorAll("[data-field]").forEach((node) => {
    const value = WEDDING[node.dataset.field];
    if (typeof value === "string") node.textContent = value;
  });

  const page = document.body.dataset.page || "invite";
  const pageNames = { invite: "Invitation", rsvp: "RSVP", admin: "Registry" };
  document.title = WEDDING.personOne + " & " + WEDDING.personTwo + " — " + (pageNames[page] || "Invitation");

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", WEDDING.description);
}

function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function bindNotice() {
  const button = document.getElementById("notice-btn");
  const notice = document.getElementById("notice");
  if (!button || !notice) return;

  button.addEventListener("click", () => {
    const willOpen = notice.hidden;
    notice.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("click", (event) => {
    if (button.contains(event.target) || notice.contains(event.target)) return;
    notice.hidden = true;
    button.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      notice.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });
}

applyWedding();
bindNotice();
