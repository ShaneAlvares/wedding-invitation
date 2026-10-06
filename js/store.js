const Store = (() => {
  const KEY = "si-rsvps";
  const ID_KEY = "si-rsvp-id";
  const TOKEN_KEY = "si-rsvp-token";

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocal(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function sheetUrl() {
    const url = typeof WEDDING.sheetUrl === "string" ? WEDDING.sheetUrl.trim() : "";
    return url.indexOf("https://script.google.com/macros/") === 0 ? url : "";
  }

  async function postSheet(payload, fallback) {
    let response;
    try {
      response = await fetch(sheetUrl(), {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error("Could not reach the reply sheet. Try again in a moment.");
    }
    const data = await response.json().catch(() => ({}));
    if (data && data.error === "Unauthorized") throw passcodeError();
    if (!response.ok || (data && data.error)) {
      throw new Error((data && data.error) || fallback);
    }
    return data;
  }

  async function shared() {
    if (sheetUrl()) return false;
    if (location.protocol === "file:") return false;
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  function remember(record) {
    if (record && record.id) localStorage.setItem(ID_KEY, record.id);
    if (record && record.token) localStorage.setItem(TOKEN_KEY, record.token);
  }

  function passcodeError() {
    const error = new Error("passcode");
    error.code = "passcode";
    return error;
  }

  return {
    shared,
    mine() {
      return {
        id: localStorage.getItem(ID_KEY) || "",
        token: localStorage.getItem(TOKEN_KEY) || "",
      };
    },
    async submit(entry) {
      const mine = this.mine();
      const payload = { ...entry, id: mine.id, token: mine.token };
      if (sheetUrl()) {
        const data = await postSheet({ action: "submit", ...payload }, "Could not save your reply.");
        if (!data || !data.id) throw new Error("The reply sheet did not confirm the save.");
        remember(data);
        return { record: data, shared: true };
      }
      if (await shared()) {
        const response = await fetch("/api/rsvps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not save your reply.");
        remember(data);
        return { record: data, shared: true };
      }

      const items = readLocal();
      const now = new Date().toISOString();
      let record = null;
      if (mine.id && mine.token) {
        record = items.find((item) => item.id === mine.id && item.token === mine.token) || null;
      }
      if (record) {
        Object.assign(record, entry, { updatedAt: now });
      } else {
        record = {
          ...entry,
          id: crypto.randomUUID(),
          token: crypto.randomUUID(),
          createdAt: now,
        };
        items.push(record);
      }
      writeLocal(items);
      remember(record);
      return { record, shared: false };
    },
    async list(code) {
      if (sheetUrl()) {
        const data = await postSheet({ action: "list", code }, "Could not open the registry.");
        return { items: Array.isArray(data.items) ? data.items : [], shared: true, sheet: true };
      }
      if (await shared()) {
        const response = await fetch("/api/rsvps", {
          headers: { "X-Admin-Code": code },
          cache: "no-store",
        });
        if (response.status === 401) throw passcodeError();
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error("Could not open the registry.");
        return { items: Array.isArray(data) ? data : [], shared: true };
      }
      if (code !== WEDDING.adminPasscode) throw passcodeError();
      return { items: readLocal(), shared: false };
    },
    async remove(id, code) {
      if (sheetUrl()) {
        const data = await postSheet({ action: "delete", id, code }, "Could not remove that reply.");
        if (!data || !data.ok) throw new Error("Could not remove that reply.");
        return;
      }
      if (await shared()) {
        const response = await fetch("/api/rsvps/" + encodeURIComponent(id), {
          method: "DELETE",
          headers: { "X-Admin-Code": code },
        });
        if (response.status === 401) throw passcodeError();
        if (!response.ok) throw new Error("Could not remove that reply.");
        return;
      }
      if (code !== WEDDING.adminPasscode) throw passcodeError();
      writeLocal(readLocal().filter((item) => item.id !== id));
    },
  };
})();
