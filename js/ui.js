function applyWedding() {
  document.querySelectorAll("[data-field]").forEach((node) => {
    const value = WEDDING[node.dataset.field];
    if (typeof value === "string") node.textContent = value;
  });

  const page = document.body.dataset.page || "invite";
  const pageNames = { invite: "Details", card: "Invitation", rsvp: "RSVP", admin: "Registry" };
  document.title = WEDDING.personOne + " & " + WEDDING.personTwo + " — " + (pageNames[page] || "Details");

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

function guestFromUrl() {
  let raw = "";
  try {
    const search = location.search.charAt(0) === "?" ? location.search.slice(1) : location.search;
    const start = search.toLowerCase().indexOf("guest=");
    if (start !== -1) {
      raw = search.slice(start + "guest=".length);
      const cut = raw.search(/&open=/i);
      if (cut !== -1) raw = raw.slice(0, cut);
      try {
        raw = decodeURIComponent(raw.replace(/\+/g, " "));
      } catch (error) {
        raw = raw.replace(/\+/g, " ");
      }
    }
  } catch (error) {
    raw = "";
  }
  return raw.replace(/[\u0000<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function applyGuest() {
  const name = guestFromUrl();
  const label = name || "MR/ MRS/ MISS ........";
  document.querySelectorAll("[data-guest]").forEach((node) => {
    node.hidden = false;
    node.textContent = label;
  });

  const input = document.getElementById("guest-name");
  if (input && name && !input.value) input.value = name;

  if (!name) return;
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^https?:/i.test(href) || href.indexOf("mailto:") === 0) return;
    if (!/\.html(?:$|\?)/.test(href)) return;
    const url = new URL(href, location.href);
    url.searchParams.set("guest", name);
    const file = url.pathname.split("/").pop() || href;
    link.setAttribute("href", file + url.search);
  });
}

applyWedding();
applyGuest();
bindNotice();
