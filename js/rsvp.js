const form = document.getElementById("rsvp-form");
const flow = document.getElementById("rsvp-flow");
const success = document.getElementById("rsvp-success");
const accept = document.getElementById("accept");
const decline = document.getElementById("decline");
const errorBox = document.getElementById("form-error");
const submitButton = document.getElementById("submit-rsvp");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");

function attending() {
  return accept.getAttribute("aria-pressed") === "true";
}

function setAttending(isComing) {
  accept.setAttribute("aria-pressed", String(isComing));
  decline.setAttribute("aria-pressed", String(!isComing));
  const label = submitButton.querySelector("span:last-child");
  label.textContent = isComing ? "Confirm & Send RSVP" : "Send Warm Regards";
  updateProgress();
}

function updateProgress() {
  const ready = document.getElementById("guest-name").value.trim().length >= 2;
  progressFill.style.width = (ready ? 100 : 23) + "%";
  progressLabel.textContent = ready ? "Ready to seal" : "Guest attendance";
}

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
  if (message) errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

accept.addEventListener("click", () => setAttending(true));
decline.addEventListener("click", () => setAttending(false));
form.querySelectorAll("input, textarea").forEach((field) => {
  field.addEventListener("input", updateProgress);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  const name = document.getElementById("guest-name").value.trim();
  const isComing = attending();

  if (name.length < 2) {
    showError("Please enter your full name.");
    return;
  }

  const entry = {
    name,
    email: "",
    attending: isComing,
    partySize: isComing ? 1 : 0,
    companion: "",
    courseId: "",
    courseName: "",
    dietary: [],
    transport: false,
    song: "",
    note: document.getElementById("note").value.trim(),
  };

  submitButton.disabled = true;
  const label = submitButton.querySelector("span:last-child");
  const previous = label.textContent;
  label.textContent = "Sealing your reply…";
  try {
    const result = await Store.submit(entry);
    const heading = document.getElementById("success-title");
    const copy = document.getElementById("success-copy");
    const localNote = document.getElementById("success-local");
    heading.textContent = isComing ? "Your place is sealed" : "Your regrets are sealed";
    copy.textContent = isComing
      ? "We are so glad you will be there, " + name + "."
      : "Thank you for telling us, " + name + ". You will be missed.";
    localNote.hidden = result.shared;
    flow.hidden = true;
    success.hidden = false;
    document.getElementById("main").scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showError(error.message || "Could not save your reply.");
    label.textContent = previous;
    submitButton.disabled = false;
  }
});

document.getElementById("edit-reply").addEventListener("click", () => {
  success.hidden = true;
  flow.hidden = false;
  submitButton.disabled = false;
  submitButton.querySelector("span:last-child").textContent = attending()
    ? "Confirm & Send RSVP"
    : "Send Warm Regards";
});

setAttending(true);
updateProgress();
