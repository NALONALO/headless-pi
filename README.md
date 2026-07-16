# headless-pi

`headless-pi` is a custom global NPM wrapper around the standard `pi` coding agent. 

## The Problem it Solves
Natively, running `pi -p "prompt"` in a non-interactive background task acts like a "black box"—it suppresses all live output and only prints the final result at the very end. For long-running subagents, this makes it impossible for the Master Agent to monitor progress, debug tool calls, or parse intermediate thoughts.

## How it Works
`headless-pi` bundles a custom TypeScript extension (`stream-output.ts`) and dynamically injects it into Pi natively via the `-e` flag. This extension explicitly hooks into Pi's event lifecycle and streams beautifully formatted ANSI output (Thoughts, Text, and Tool Executions) directly to `stderr` in real-time.

## Installation & Usage

### 1. Prerequisites
Ensure the standard Pi coding agent is installed globally:
```bash
npm install -g @earendil-works/pi-coding-agent
```

### 2. Installation
Install `headless-pi` globally from the local source directory:
```bash
npm install -g .
```

### 3. Basic Usage
Use it exactly like the standard `pi` command. For example:
```bash
headless-pi -p "Your prompt here"
```

#### CLI Options
`headless-pi` introduces custom flags alongside standard `pi` options:

*   `--stream=<value>`: Customize what events are streamed live to `stderr` in real-time.
    *   `message` (Default): Streams conversational text.
    *   `thinking`: Streams the internal thinking monologue.
    *   `tools`: Streams tool calls, running updates, results, and errors.
    *   `all`: Streams all events (thinking, messages, tools).
    *   `off`: Disables streaming completely.
    
    *Note: You can combine values using comma separation, e.g. `--stream=message,thinking`.*


## Master Agent Guidelines

When delegating multi-step tasks to an autonomous local LLM subagent, you should use this wrapper instead of `pi` directly.

### 1. Always use `headless-pi`
Launch background tasks via terminal commands. By default, it streams only the conversational agent message text (`--stream=message`) to reduce log verbosity:
```bash
headless-pi -p "Execute the plan outlined in /path/to/plan.md"
```

### 2. Stream Configuration & Verbosity
You can customize the streaming verbosity using the `--stream` flag:
- `--stream=message` (Default): Streams only conversational text messages (`MESSAGE`).
- `--stream=thinking`: Streams only thinking monologues (`THINKING`).
- `--stream=tools`: Streams only tool executions and results (`CALLING TOOL` / `TOOL RESULT`).
- `--stream=all`: Streams all events (thinking, messages, and tools).
- `--stream=off`: Disables streaming.

Example to stream everything:
```bash
headless-pi --stream=all -p "Execute the plan outlined in /path/to/plan.md"
```

Since the parser checks for substring inclusion, you can also combine options, e.g., `--stream=message,thinking`.

### 3. Log Structure
The streaming output contains formatted tags depending on your stream settings:
- `▶ THINKING`: The LLM's internal monologue
- `▶ MESSAGE`: The LLM's conversational text
- `▶ CALLING TOOL: <tool>`: The LLM executing a tool with arguments
- `▶ TOOL RESULT: <tool>` / `▶ TOOL ERROR: <tool>`: The result or error of the tool execution

By reading the task logs of `headless-pi`, you maintain full observability over the subagent's execution state without ever being blocked by a black box execution.
