"use strict";

const DEFAULT_SERVER = "https://www.overleaf.com";
const SESSION_COOKIE_NAMES = ["overleaf_session2", "sharelatex.sid", "overleaf_session"];
const STORAGE_SERVER = "overleafCookie.server";
const STORAGE_ALL = "overleafCookie.all";

const $ = (id) => document.getElementById(id);
const serverInput = $("server");
const allCheckbox = $("all");
const copyButton = $("copy");
const tabButton = $("useTab");
const output = $("output");
const statusLine = $("status");

function setStatus(text, kind = "") {
  statusLine.textContent = text;
  statusLine.className = kind;
}

function store(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* storage unavailable */ }
}

function load(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

/** Normalise user input ("overleaf.example.org/project/x") to an origin. */
function toOrigin(raw) {
  let text = (raw || "").trim();
  if (!text) text = DEFAULT_SERVER;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = "https://" + text;
  const url = new URL(text);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http:// and https:// servers are supported.");
  }
  return url.origin;
}

async function getActiveTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch (_) {
    return null;
  }
}

function tabOrigin(tab) {
  try {
    const url = new URL(tab.url);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch (_) {
    return null;
  }
}

async function getCookies(origin, storeId) {
  const details = { url: origin + "/project", firstPartyDomain: null };
  if (storeId) details.storeId = storeId;
  try {
    return await browser.cookies.getAll(details);
  } catch (_) {
    // Older Firefox or no First-Party Isolation support for this argument.
    delete details.firstPartyDomain;
    return await browser.cookies.getAll(details);
  }
}

async function copyCookie() {
  setStatus("");
  output.value = "";

  let origin;
  try {
    origin = toOrigin(serverInput.value);
  } catch (e) {
    setStatus("Invalid server URL: " + e.message, "err");
    return;
  }
  serverInput.value = origin;
  store(STORAGE_SERVER, origin);
  store(STORAGE_ALL, allCheckbox.checked ? "1" : "0");

  // Must run before any other await so it stays inside the click gesture.
  const permission = { origins: [origin + "/*"] };
  let granted = await browser.permissions.contains(permission);
  if (!granted) {
    try {
      granted = await browser.permissions.request(permission);
    } catch (e) {
      setStatus("Permission request failed: " + e.message, "err");
      return;
    }
  }
  if (!granted) {
    setStatus("Permission to read cookies for " + origin + " was denied.", "err");
    return;
  }

  copyButton.disabled = true;
  try {
    const tab = await getActiveTab();
    const storeId = tab && tabOrigin(tab) === origin ? tab.cookieStoreId : undefined;
    const cookies = await getCookies(origin, storeId);

    let text;
    if (allCheckbox.checked) {
      if (!cookies.length) throw new Error("No cookies found for " + origin + ". Are you logged in?");
      text = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    } else {
      const found = SESSION_COOKIE_NAMES
        .map((name) => cookies.find((c) => c.name === name))
        .find(Boolean);
      if (!found) {
        throw new Error(
          "No session cookie (" + SESSION_COOKIE_NAMES.join(", ") + ") found for " + origin +
          ". Log in first, or try \"Copy all cookies\"."
        );
      }
      text = `${found.name}=${found.value}`;
    }

    output.value = text;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.", "ok");
    } catch (_) {
      output.select();
      setStatus("Could not write to the clipboard; select the text above and copy it.", "err");
    }
  } catch (e) {
    setStatus(e.message, "err");
  } finally {
    copyButton.disabled = false;
  }
}

async function useTabOrigin() {
  const tab = await getActiveTab();
  const origin = tab && tabOrigin(tab);
  if (origin) {
    serverInput.value = origin;
    setStatus("");
  } else {
    setStatus("The current tab is not an http(s) page.", "err");
  }
}

async function init() {
  allCheckbox.checked = load(STORAGE_ALL) === "1";
  serverInput.value = load(STORAGE_SERVER) || DEFAULT_SERVER;

  const tab = await getActiveTab();
  const origin = tab && tabOrigin(tab);
  if (origin && /overleaf|sharelatex|latex/i.test(new URL(origin).hostname)) {
    serverInput.value = origin;
  }
}

copyButton.addEventListener("click", copyCookie);
tabButton.addEventListener("click", useTabOrigin);
serverInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") copyCookie();
});
init();
