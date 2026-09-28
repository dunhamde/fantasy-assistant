"use strict";

const crypto = require("node:crypto");

function randomUrlSafe(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function challengeFor(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

module.exports = { randomUrlSafe, challengeFor };
