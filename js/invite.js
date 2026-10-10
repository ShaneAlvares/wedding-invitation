function renderEvents() {
  const list = document.getElementById("itinerary-list");
  if (!list) return;
  list.replaceChildren();
  WEDDING.events.forEach((event) => {
    const article = document.createElement("article");
    article.className = "event";

    const iconWrap = document.createElement("div");
    iconWrap.className = "event-icon";
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.textContent = event.icon;
    iconWrap.append(icon);

    const copy = document.createElement("div");
    const top = document.createElement("div");
    top.className = "event-top";
    const title = document.createElement("h3");
    title.textContent = event.title;
    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = event.time;
    top.append(title, time);

    const place = document.createElement("p");
    place.textContent = event.place;
    const note = document.createElement("p");
    note.className = "event-note";
    note.textContent = event.note;
    copy.append(top, place, note);
    article.append(iconWrap, copy);
    list.append(article);
  });
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function icsLocal(value) {
  const date = value instanceof Date ? value : new Date(value);
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    "00"
  );
}

function startCountdown() {
  const days = document.getElementById("count-days");
  const hours = document.getElementById("count-hours");
  const mins = document.getElementById("count-mins");
  if (!days || !hours || !mins) return;

  const target = new Date(WEDDING.dateISO).getTime();
  const tick = () => {
    const diff = Math.max(0, target - Date.now());
    days.textContent = String(Math.floor(diff / 86400000));
    hours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    mins.textContent = pad(Math.floor((diff % 3600000) / 60000));
  };
  tick();
  window.setInterval(tick, 30000);
}

function bindSeal() {
  const seal = document.getElementById("wax-seal");
  const itinerary = document.getElementById("itinerary");
  if (!seal || !itinerary) return;
  seal.addEventListener("click", () => {
    const willOpen = itinerary.hidden;
    itinerary.hidden = !willOpen;
    seal.classList.toggle("is-open", willOpen);
    seal.setAttribute("aria-expanded", String(willOpen));
  });
}

function bindCalendar() {
  const button = document.getElementById("add-calendar");
  if (!button) return;
  button.addEventListener("click", () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Steeve and Michelle//Wedding//EN",
      "BEGIN:VEVENT",
      "UID:wedding-" + WEDDING.dateISO.replace(/[^\d]/g, "") + "@invitation",
      "DTSTAMP:" + stamp,
      "DTSTART:" + icsLocal(WEDDING.dateISO),
      "DTEND:" + icsLocal(WEDDING.endISO),
      "SUMMARY:" + WEDDING.personOne + " & " + WEDDING.personTwo,
      "LOCATION:" + WEDDING.venueName,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const file = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "steeve-and-michelle.ics";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    button.querySelector("span:last-child").textContent = "Saved to your calendar";
    window.setTimeout(() => {
      button.querySelector("span:last-child").textContent = "Add to Calendar";
    }, 1800);
  });
}

function bindDirections() {
  const button = document.getElementById("directions");
  if (!button) return;
  button.addEventListener("click", () => {
    const query = encodeURIComponent(WEDDING.mapsQuery);
    window.open("https://www.google.com/maps/search/?api=1&query=" + query, "_blank", "noopener");
  });
}

function bindEnvelope() {
  const envelope = document.getElementById("envelope");
  const openSeal = document.getElementById("open-seal");
  if (!envelope) return;
  const main = document.getElementById("main");
  const nav = document.querySelector(".tabbar");
  if (document.documentElement.classList.contains("opened")) {
    envelope.hidden = true;
    return;
  }
  if (main) main.setAttribute("aria-hidden", "true");
  if (nav) nav.setAttribute("aria-hidden", "true");
  if (!openSeal) return;

  const finish = () => {
    envelope.hidden = true;
    if (main) {
      main.removeAttribute("aria-hidden");
      main.focus();
    }
    if (nav) nav.removeAttribute("aria-hidden");
  };

  openSeal.addEventListener("click", () => {
    if (envelope.classList.contains("is-opening")) return;
    envelope.classList.add("is-opening");
    try {
      sessionStorage.setItem("si-opened", "1");
    } catch (error) {
      /* private mode can block storage */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => envelope.classList.add("is-leaving"), reduce ? 0 : 760);
    window.setTimeout(finish, reduce ? 160 : 1280);
  });
}

renderEvents();
startCountdown();
bindSeal();
bindCalendar();
bindDirections();
bindEnvelope();
