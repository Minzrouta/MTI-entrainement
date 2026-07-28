---
title: "Linux for developers"
date: "2026-09-29"
category: "DevOps"
level: "Fondamental"
summary: "Processes and signals, permissions, pipes, systemd and the commands that save the day: the Linux foundation expected from a dev intern — plus the method for debugging a server that stopped responding."
---

## The essentials

Your servers run Linux. So do your Docker containers. Your CI, your Raspberry Pi, and 100% of the top 500 supercomputers. A developer who can find their way around a Linux shell debugs alone what others escalate — exactly what a recruiter looks for in an intern.

Two founding ideas structure the whole system:

- **Everything is a file** — disks (`/dev/sda`), sockets, and even kernel state: `/proc` is a virtual filesystem where every process has its directory (`/proc/1234/`), where `cat /proc/cpuinfo` reads the CPUs and `/proc/meminfo` the memory. Read, write, redirect: one interface for everything.
- **Small composable tools** — the Unix philosophy: each program does *one* thing well, text is the universal interface, and the pipe `|` assembles them into powerful chains. `grep` can't sort, `sort` can't filter — together, they do log analysis.

## How it works

### Processes: fork, exec, signals

A new process is always born through **`fork()`** (the parent clones itself) usually followed by **`exec()`** (the clone replaces itself with the new program) — that's how your shell launches every command. Each process has a **PID**; the very first, **PID 1** (systemd), boots the system and adopts orphans.

You talk to processes through **signals**:

| Signal | # | Effect | Catchable? |
|---|---|---|---|
| SIGHUP | 1 | terminal closed / reload config | yes |
| SIGINT | 2 | Ctrl+C | yes |
| SIGTERM | 15 | "terminate cleanly" (default of `kill`) | yes |
| SIGKILL | 9 | immediate death, decided by the kernel | **no** |
| SIGSEGV | 11 | invalid memory access | yes |
| SIGSTOP / SIGCONT | 19 / 18 | pause / resume | no / yes |

**SIGTERM vs SIGKILL**, the nuance that matters: SIGTERM is a *request* — the process can close its connections, flush its buffers, save, then exit. SIGKILL never reaches it: the kernel removes it, with zero cleanup. That's the exact protocol of `docker stop`: SIGTERM to the container's PID 1, a 10-second grace period, then SIGKILL. An app that doesn't listen for SIGTERM (or launched behind a shell that doesn't forward signals) dies brutally on every deployment.

### stdin, stdout, stderr and redirections

Every process starts with three numbered streams: standard input (0), standard output (1) and standard error (2). The shell can rewire them at will:

```text
         stdin (0)             stdout (1)
keyboard ─────────▶ process ─────────▶ terminal
                       │
                       └─── stderr (2) ─────▶ terminal

cmd > out.log     stdout → file (overwrites; >> appends)
cmd 2> err.log    stderr → file
cmd > f 2>&1      both → f (order matters!)
cmd1 | cmd2       stdout of cmd1 → stdin of cmd2
```

The pipe is the centerpiece: it plugs one program's output into the next one's input, no intermediate file. A real case — find the IPs hammering your login endpoint:

```bash
grep "POST /api/login" access.log \
  | awk '{print $1}'   # extract the 1st column: the IP
  | sort               # uniq requires adjacent lines
  | uniq -c            # count occurrences per IP
  | sort -rn           # descending numeric sort
  | head -10           # top 10 most insistent IPs
```

> 💡 **Reflex to show** — the `sort` before `uniq -c` isn't decorative: `uniq` only merges *adjacent* lines. Forgetting it produces wrong counts — the kind of detail that proves in an interview you've actually practiced.

## Key concepts to master

- **rwx permissions** — three triplets: owner, group, others. In octal: r=4, w=2, x=1. `chmod 755` = `rwxr-xr-x` (executable by everyone, writable only by the owner); `600` = `rw-------` (private SSH key). `sudo` runs a command as root — a privilege to justify, not a reflex.
- **Environment variables & PATH** — a key=value set inherited by child processes (`export API_URL=…`). `PATH` lists the directories where the shell looks for commands, in order — that's why a local script runs with `./script.sh`, and why `which python` clears up doubts.
- **systemd at a glance** — the service manager: `systemctl status nginx` (state), `start`/`stop`/`restart`, `enable` (start at boot). Logs go through `journalctl -u nginx -f` (`-f` follows live).
- **The commands that save the day** — `grep -rn "pattern" .` (search the code), `find . -name "*.log"` (find files), `ps aux` (running processes), `ss -tlnp` (listening ports and by whom), `tail -f app.log` (follow a log live), `df -h` (disk space), `du -sh *` (what takes the space), `top`/`htop` (CPU/RAM in real time).
- **SSH & keys** — a public/private key pair replaces the password: the public key goes into the server's `~/.ssh/authorized_keys`, the private one *never* leaves your machine. Safer (nothing to brute-force) and scriptable (CI, deployments).

> 🎤 **In an interview** — "a server stopped responding, what do you do?" Unroll a method, not a list: (1) I get access — ping, then SSH; (2) `top` — CPU maxed out? out of RAM? a runaway process?; (3) `df -h` — full disk, the dumbest and most frequent cause; (4) `ss -tlnp` — is my service still listening on its port?; (5) `systemctl status app` then `journalctl -u app -n 100` or `tail -f` on its logs — the error is almost always there. A structured approach beats ten recited commands.

## In an interview

**"SIGTERM vs SIGKILL?"** — SIGTERM (15) requests a clean shutdown: the process can catch it to close connections and flush buffers. SIGKILL (9) is uncatchable: the kernel kills without cleanup. Bonus: `docker stop` sends SIGTERM, waits 10 s, then SIGKILL — hence the importance of handling SIGTERM in a containerized app.

**"What does `chmod 640` mean?"** — Octal: 6 = rw- (owner), 4 = r-- (group), 0 = --- (others). Read-write for the owner, read-only for the group, nothing for the rest of the world — typical for a config file holding secrets.

**"How is a process created on Linux?"** — Through `fork()`: the parent clones itself (same code, copied memory); then usually `exec()` replaces the clone's image with the new program. The shell does fork + exec for every command, and `wait()` to collect the exit code.

**"What is PATH for?"** — It's the ordered list of directories where the shell looks for an executable when you type a command without a path. First found, first served — hence the surprises when two versions of a tool coexist (`which` settles it).

**"How do you read a service's logs in production?"** — systemd service: `journalctl -u service-name -f` (or `-n 200` for the last 200 lines). Classic file: `tail -f /var/log/app.log`, filtered with `grep`. Container: `docker logs -f`, since the app logs to stdout/stderr.

## Pitfalls & misconceptions

> ⚠️ **The two toxic reflexes** — `kill -9` as a first move: the process dies without flushing or releasing its resources (orphaned lock files, corrupted data); always SIGTERM first, SIGKILL as a last resort. And `chmod 777` "to make it work": you've just granted write access to every user on the system — fix the owner (`chown`) or the group, not the whole world's permissions.

- **"df says the disk is full, but du finds nothing"** — a process is holding a deleted file open: the space is only freed on close. `lsof | grep deleted`, then restart the guilty service. Classic with big logs deleted while hot.
- **A non-exported variable doesn't exist for children** — `VAR=x` stays local to the shell; you need `export VAR=x` for a process launched afterwards to see it. Frequent source of "works in my terminal, not in the service".
- **`sudo` is not a magic word** — rerunning a failed command with `sudo` without understanding *why* it failed creates root-owned files in your project, and the real problem remains untouched.
- **`netstat` is deprecated** — the modern tool is `ss` (same usage: `ss -tlnp`), present everywhere `netstat` has vanished from minimal images.

## Going further

- [MIT — The Missing Semester](https://missingsemester.csail.mit.edu/): the course every school should teach (shell, tooling, debugging)
- [explainshell.com](https://explainshell.com/): paste a command, every flag explained from the man pages
- [man7.org](https://man7.org/linux/man-pages/): the reference man pages (signal(7), proc(5)…)
- [Julia Evans — Wizard Zines](https://wizardzines.com/): the zines that make `strace`, signals and pipes crystal clear
- Practice: open a shell and explore `ls /proc/$$/` — the process directory… of your own shell
