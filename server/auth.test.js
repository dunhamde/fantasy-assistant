"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUrlSafe, challengeFor } = require("./auth");

test("PKCE challenge is the SHA-256 hash of its verifier", () => {
  assert.equal(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.ok(randomUrlSafe().length >= 43);
});

