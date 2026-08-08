#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const installer = path.join(root, "scripts", "file-inspection-and-fixes.command");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "my-finance-installer-"));
const fixture = path.join(tempRoot, "project");

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: fixture,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  ...options
});

try {
  assert.equal(process.platform, "darwin", "The installer regression test must run on macOS.");
  assert.ok(fs.existsSync(installer), "Installer script is missing.");

  fs.cpSync(root, fixture, {
    recursive: true,
    filter: source => ![".git", "node_modules", "_site"].includes(path.basename(source))
  });
  run("git", ["init", "-q"]);
  run("git", ["config", "user.email", "installer-test@example.invalid"]);
  run("git", ["config", "user.name", "Installer Test"]);
  run("git", ["add", "."]);
  run("git", ["commit", "-qm", "fixture"]);

  fs.rmSync(path.join(fixture, "offline.html"));
  fs.mkdirSync(path.join(fixture, "node_modules"));
  fs.writeFileSync(path.join(fixture, "node_modules", "stale-file"), "stale\n");

  const first = spawnSync("/bin/bash", [installer, "--repo-dir", fixture], { encoding: "utf8" });
  assert.equal(first.status, 0, `Installer repair run failed:\n${first.stdout}\n${first.stderr}`);
  assert.match(first.stdout, /Restored missing tracked file: offline\.html/);
  assert.ok(fs.existsSync(path.join(fixture, "offline.html")), "Installer did not restore offline.html.");
  assert.ok(!fs.existsSync(path.join(fixture, "node_modules", "stale-file")), "npm ci did not replace stale dependency metadata.");
  assert.equal(run("git", ["status", "--porcelain"]), "", "Installer left tracked changes after repair.");

  const second = spawnSync("/bin/bash", [installer, "--repo-dir", fixture], { encoding: "utf8" });
  assert.equal(second.status, 0, `Installer repeat run failed:\n${second.stdout}\n${second.stderr}`);
  assert.match(second.stdout, /no safe file repairs were needed/);
  assert.equal(run("git", ["status", "--porcelain"]), "", "Repeat installation changed the repository.");

  console.log("macOS installer test passed: missing-file repair, dependency reset, verification, and repeat safety.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
