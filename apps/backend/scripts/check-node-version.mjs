const [majorRaw] = process.versions.node.split(".");
const major = Number.parseInt(majorRaw, 10);

if (!Number.isInteger(major)) {
  console.error(`[env] Invalid Node.js version: ${process.versions.node}`);
  process.exit(1);
}

if (major < 20 || major >= 23) {
  console.error(`[env] Unsupported Node.js version: ${process.versions.node}`);
  console.error("[env] Required: >=20 <23 (recommended: 22.x)");
  console.error("[env] Please switch Node version, then rerun checks.");
  process.exit(1);
}

console.log(`[env] Node.js ${process.versions.node} is supported.`);
