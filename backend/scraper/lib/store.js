const fs = require("fs");
const path = require("path");

const LOCKERS_PATH = path.join(__dirname, "..", "..", "data", "lockers.json");
const LOG_PATH = path.join(__dirname, "..", "..", "data", "update-log.json");
const MAX_LOG_ENTRIES = 50;

function loadLockers() {
  return JSON.parse(fs.readFileSync(LOCKERS_PATH, "utf-8"));
}

function saveLockers(lockers) {
  fs.writeFileSync(LOCKERS_PATH, JSON.stringify(lockers, null, 2) + "\n");
}

function loadLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
}

function appendLog(entry) {
  const log = loadLog();
  log.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log.slice(-MAX_LOG_ENTRIES), null, 2) + "\n");
}

module.exports = { loadLockers, saveLockers, loadLog, appendLog };
