// Automatically starts a Cloudflare quick tunnel (trycloudflare.com) and
// resolves with the public HTTPS URL once cloudflared announces it.
// The tunnel process is kept alive for the lifetime of this Node process.
//
// Requirements: `cloudflared` must be installed and on PATH.
// Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

const { spawn } = require("child_process");

const TUNNEL_URL_PATTERN = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

/**
 * Spawns `cloudflared tunnel --url http://localhost:<port>`, waits for the
 * tunnel URL to appear in its output, sets process.env.PUBLIC_BASE_URL, and
 * resolves with that URL.
 *
 * If cloudflared is not installed or exits before emitting a URL, the promise
 * rejects with a descriptive error — the caller should catch and warn rather
 * than crash, since the rest of the app works fine without a tunnel URL.
 *
 * @param {number|string} port  Local port to tunnel (defaults to PORT env var or 4000).
 * @returns {Promise<string>}   The public tunnel URL.
 */
function startTunnel(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "cmd.exe",
      [
        "/c",
        "cloudflared",
        "tunnel",
        "--url",
        `http://localhost:${port}`
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let resolved = false;

    function scanForUrl(data) {
      if (resolved) return;
      const text = data.toString();
      const match = text.match(TUNNEL_URL_PATTERN);
      if (match) {
        resolved = true;
        process.env.PUBLIC_BASE_URL = match[0];
        resolve(match[0]);
      }
    }

    proc.stdout.on("data", scanForUrl);
    proc.stderr.on("data", scanForUrl);

    proc.on("error", (err) => {
      if (resolved) return;
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "cloudflared not found on PATH. " +
              "Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ " +
              "then restart the server."
          )
        );
      } else {
        reject(err);
      }
    });

    proc.on("exit", (code) => {
      if (!resolved) {
        reject(new Error(`cloudflared exited unexpectedly (code ${code}) before a tunnel URL was emitted.`));
      }
    });

    // Ensure the child is cleaned up when this process exits.
    const cleanup = () => { try { proc.kill(); } catch (_) {} };
    process.once("exit", cleanup);
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  });
}

module.exports = { startTunnel };