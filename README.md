# headless-pi

`headless-pi` is a custom global NPM wrapper around the standard `pi` coding agent. 

## The Problem it Solves
Natively, running `pi -p "prompt"` in a non-interactive background task acts like a "black box"—it suppresses all live output and only prints the final result at the very end. For long-running subagents, this makes it impossible for the Master Agent to monitor progress, debug tool calls, or parse intermediate thoughts.

## How it Works
`headless-pi` bundles a custom TypeScript extension (`stream-output.ts`) and dynamically injects it into Pi natively via the `-e` flag. This extension explicitly hooks into Pi's event lifecycle and streams beautifully formatted ANSI output (Thoughts, Text, and Tool Executions) directly to `stderr` in real-time.

## Master Agent Guidelines

When delegating multi-step tasks to an autonomous local LLM subagent, you should use this wrapper instead of `pi` directly.

### 1. Always use `headless-pi`
Launch background tasks via terminal commands using:
```bash
headless-pi -p "Execute the plan outlined in /path/to/plan.md"
```

### 2. Wait Asynchronously
If you are calling this programmatically, run the command in the background. You will receive live streaming updates in the task log as `headless-pi` executes the ReAct loop.

### 3. Log Structure
The streaming output contains highly parseable tags:
- `[THINKING]`: The LLM's internal monologue
- `[MESSAGE]`: The LLM's conversational text
- `[CALLING TOOL: <tool>]`: The LLM executing a tool with arguments
- `[TOOL RESULT: <tool>]`: The executed output of the tool

By reading the task logs of `headless-pi`, you maintain full observability over the subagent's execution state without ever being blocked by a black box execution.
