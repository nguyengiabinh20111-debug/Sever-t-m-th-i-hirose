const messages = [];
const users = new Map();
const reactions = {};
let nextId = 1;

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function cleanupOld() {
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of users.entries()) {
    if (now - v.lastSeen > 120) users.delete(k);
  }
  while (messages.length > 150) messages.shift();
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return jsonRes({ ok: true });
    cleanupOld();
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/messages") {
      const after = Number(url.searchParams.get("after") || 0);
      const list = after > 0 ? messages.filter((m) => m.id > after) : messages.slice(-40);
      return jsonRes({
        ok: true,
        messages: list,
        users: Array.from(users.values()),
        reactions
      });
    }

    if (request.method === "POST" && path === "/send") {
      const body = await request.json().catch(() => ({}));
      const text = String(body.text || "").trim().slice(0, 200);
      if (!text) return jsonRes({ ok: false, error: "empty" }, 400);
      const user = String(body.user || "Player").slice(0, 40);
      const displayName = String(body.displayName || user).slice(0, 40);
      const userId = Number(body.userId || 0);
      const now = Math.floor(Date.now() / 1000);
      if (user && user !== "Player") {
        users.set(user, { user, displayName, userId, lastSeen: now });
      }
      const msg = {
        id: nextId++,
        user,
        displayName,
        userId,
        text,
        time: now,
        server: String(body.server || "Global")
      };
      messages.push(msg);
      return jsonRes({ ok: true, id: msg.id });
    }

    if (request.method === "POST" && path === "/ping") {
      const body = await request.json().catch(() => ({}));
      const user = String(body.user || "").trim();
      const now = Math.floor(Date.now() / 1000);
      if (user && user !== "Player") {
        users.set(user, {
          user,
          displayName: String(body.displayName || user),
          userId: Number(body.userId || 0),
          lastSeen: now
        });
      }
      return jsonRes({ ok: true, users: Array.from(users.values()) });
    }

    if (request.method === "POST" && path === "/react") {
      const body = await request.json().catch(() => ({}));
      const mid = Number(body.messageId || 0);
      const emoji = String(body.emoji || "").trim();
      if (mid > 0 && emoji) reactions[String(mid)] = emoji;
      return jsonRes({ ok: true });
    }

    return jsonRes({ ok: true, status: "Hirose temp chat online" });
  }
};
