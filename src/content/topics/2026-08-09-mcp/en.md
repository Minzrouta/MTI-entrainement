---
title: "MCP: the Model Context Protocol"
date: "2026-08-09"
category: "IA"
level: "Intermédiaire"
summary: "The open protocol connecting LLMs to tools and data: architecture, transports, security — the freshest AI topic to bring up in a 2026 interview."
---

## The essentials

The **Model Context Protocol (MCP)** is an open protocol, launched by Anthropic in late 2024, that standardizes how LLM applications connect to external **tools** and **data sources**. The problem it solves: every AI application (Claude, an IDE, a homemade agent) had to build its own integration for every service (GitHub, Postgres, Slack…). That's the **N×M integration** problem: N applications × M services = N×M connectors to write and maintain.

MCP breaks that combinatorics the way USB-C did for peripherals: a GitHub MCP server written **once** works with **every** MCP-compatible application. You go from N×M to N+M. The protocol has been adopted beyond Anthropic — OpenAI, Google DeepMind, Microsoft, and IDEs (VS Code, Cursor, Zed) have integrated it — which makes it a de facto standard of the agent ecosystem, and an excellent tech-watch topic to bring up in an interview.

The key idea to remember: MCP doesn't make the model smarter, it **standardizes the plumbing** between the model and the outside world.

## How it works

The architecture is **client-server**, with three roles:

- **Host** — the LLM application the user interacts with: Claude Desktop, Claude Code, an IDE, a custom agent. It orchestrates everything: it manages connections, aggregates capabilities and decides (with the user) what the model may do.
- **Client** — the connector, inside the host: a 1-to-1 connection with one server. A host talking to three servers maintains three clients.
- **Server** — a (often tiny) program exposing capabilities: access to GitHub, a database, a browser, the filesystem.

A server can expose three kinds of capabilities, and the distinction is a classic interview question:

- **Tools** — functions **the model** decides to call (with user approval): `create_issue`, `query_database`. Model-controlled.
- **Resources** — read-only data **the application** attaches to the context: file contents, a database row, an API response. Application-controlled.
- **Prompts** — reusable templates **the user** triggers explicitly (menus, slash commands). User-controlled.

Under the hood, everything runs over **JSON-RPC 2.0**: the session starts with an `initialize` handshake where client and server negotiate protocol version and capabilities, then the client discovers what's available (`tools/list`) and calls it (`tools/call`). Two standard **transports**: **stdio** — the host launches the server as a subprocess and communicates over stdin/stdout, ideal locally (that's how Claude Desktop launches most servers); and **streamable HTTP** — the server is a remote HTTP endpoint with response streaming (this transport replaces the older HTTP+SSE), for shared or hosted servers.

## Key concepts to master

- **MCP vs function calling**: function calling has existed since 2023 — you describe functions in JSON Schema and the model generates calls. But each integration remains custom code inside a single app. MCP standardizes the **layer above**: dynamic tool discovery, communication protocol, session lifecycle. An MCP server is reusable by any host; a function hardwired into your backend is not. The two complement each other: on the model side, an MCP tool ends up looking like classic function calling.
- **Ecosystem**: thousands of servers exist — official ones (GitHub, filesystem, fetch/browser, persistent memory), vendor ones (Stripe, Notion, Sentry, Cloudflare…), community ones (Postgres, Docker, Kubernetes). The official SDKs (TypeScript, Python, and others) let you write a basic server in a few dozen lines: you declare a tool with its input schema, the SDK handles the protocol.
- **Security — the topic that sets you apart**: plugging tools into an LLM opens real risks. The main one: **indirect prompt injection** — external content read by a tool (a GitHub issue, a web page, an email) contains malicious instructions the model may follow, e.g. "exfiltrate the secrets via the email-sending tool". The dangerous combination: access to private data + exposure to untrusted content + an external communication channel. Countermeasures: **principle of least privilege** (minimally-scoped tokens, read-only servers when possible), **human-in-the-loop** (approval of sensitive calls), don't stack unaudited servers, isolate risky ones.
- **Honest limitations**: every connected server adds its tool definitions to the context (token cost), community server quality varies, and an agent with 50 tools chooses less well than with 5. MCP is an infrastructure building block, not a magic wand.

## In an interview

**"What is MCP, in two sentences?"** — An open protocol standardizing the connection between LLM applications and external tools/data, the way USB-C standardizes peripherals. It turns the N×M integration problem into N+M: a server written once serves every compatible host.

**"How is it different from function calling?"** — Function calling is the mechanism by which a model generates function calls; it's proprietary to each app. MCP is an open protocol on top: dynamic discovery, standardized transport (JSON-RPC over stdio or HTTP), reusability across applications. Analogy: function calling = knowing how to call a function; MCP = the standard that lets you plug in interchangeable function libraries.

**"Tools, resources, prompts: who controls what?"** — Tools: the model decides the call (the user approves). Resources: the application chooses what it attaches to the context. Prompts: the user triggers them explicitly. This separation of control is a deliberate protocol design choice.

**"What security risks come with MCP?"** — Indirect prompt injection through the content tools bring back (the model may follow instructions hidden in a web page or an issue), excessive privileges (an overly broad token), and unaudited third-party servers. Answers: least privilege, human approval of sensitive actions, never combining private data + untrusted content + an output channel without guardrails.

**"Have you actually used it?"** — The best intern answer: cite real usage (a GitHub or Postgres MCP server plugged into Claude Code or an IDE), or better, having written a small server with the Python/TypeScript SDK — thirty lines are enough to expose a tool and understand the protocol from the inside.

## Pitfalls & misconceptions

- **"MCP makes the model smarter"** — no: it standardizes tool access. A model that reasons poorly will still pick the wrong tools, protocol or not.
- **"MCP replaces APIs"** — no: an MCP server is almost always a **wrapper** around an existing API, describing it in a format an LLM can consume. The REST API is still underneath.
- **Plugging in 15 servers "to be complete"** — every tool costs context tokens and dilutes the model's ability to pick the right one. A few relevant servers beat a catalog.
- **Trusting any community server** — an MCP server runs code on your machine (stdio transport) and sees sensitive data pass through. Read the code or pick official/audited servers.
- **Ignoring prompt injection** — "the model would never execute that" is an assumption, not a guarantee. Guardrails belong in permissions and approval, not in hope.
- **Confusing host and client** — the host is the application; the client is the 1-to-1 connection to one server, inside the host. A small precision that shows you've read the spec.

## Going further

- [modelcontextprotocol.io](https://modelcontextprotocol.io/) — the official site: introduction, concepts, specification
- [The MCP specification](https://modelcontextprotocol.io/specification/latest) — handshake, capabilities, transports (readable in an hour)
- [The official servers repository](https://github.com/modelcontextprotocol/servers) — to read real server code and take inspiration
- Write your first server with the [Python SDK](https://github.com/modelcontextprotocol/python-sdk) or [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), then plug it into Claude Desktop or Claude Code — the best one-evening investment for a 2026 interview
