import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const COLORS = {
  RESET: "\x1b[0m",
  THINKING: "\x1b[38;5;245m", // grayish
  TEXT: "\x1b[36m",          // cyan
  TOOL: "\x1b[35m",          // magenta
  ERROR: "\x1b[31m"          // red
};

function formatToolOutput(res: any): string {
    if (!res) return "(empty)";
    let str = "";
    if (typeof res === "string") {
        try { res = JSON.parse(res); } catch { /* ignore */ }
    }
    if (typeof res === "object" && res !== null) {
        if (Array.isArray(res.content)) {
            const texts = res.content
                .filter((item: any) => item?.type === "text" && item.text)
                .map((item: any) => item.text);
            if (texts.length) {
                str = texts.join("\n");
            }
        }
        if (!str) {
             str = JSON.stringify(res, null, 2);
        }
    } else {
        str = String(res);
    }
    if (str.length > 2000) {
         str = str.substring(0, 2000) + "\n... (truncated)";
    }
    return str.split("\n").map(l => "    " + l).join("\n");
}

export default function headlessStreamingExtension(pi: ExtensionAPI): void {
    pi.registerFlag("stream", {
        description: "Streams live output (message,thinking,tools,all)",
        type: "string",
        default: "off"
    });
    
    function logHeader(color: string, label: string) {
        process.stderr.write(`\n${color}▶ ${label}${COLORS.RESET}\n`);
    }

    pi.on("message_update", async (event) => {
        const streamFlag = pi.getFlag("stream") || "off";
        if (streamFlag === "off") return;
        const e = event.assistantMessageEvent;
        if (!e) return;

        if (e.type === "thinking_start" && (streamFlag.includes("thinking") || streamFlag.includes("all"))) {
            logHeader(COLORS.THINKING, "THINKING");
        } else if (e.type === "thinking_delta" && (streamFlag.includes("thinking") || streamFlag.includes("all"))) {
            process.stderr.write(COLORS.THINKING + e.delta + COLORS.RESET);
        } else if (e.type === "text_start" && (streamFlag.includes("message") || streamFlag.includes("all"))) {
            logHeader(COLORS.TEXT, "MESSAGE");
        } else if (e.type === "text_delta" && (streamFlag.includes("message") || streamFlag.includes("all"))) {
            process.stderr.write(COLORS.TEXT + e.delta + COLORS.RESET);
        }
    });

    let hasActiveTool = false;

    pi.on("tool_execution_start", async (event) => {
        const streamFlag = pi.getFlag("stream") || "off";
        if (!streamFlag.includes("tools") && !streamFlag.includes("all")) return;
        hasActiveTool = true;
        logHeader(COLORS.TOOL, `CALLING TOOL: ${event.toolName}`);
        const argsStr = typeof event.args === "object" ? JSON.stringify(event.args, null, 2) : String(event.args);
        process.stderr.write(COLORS.TOOL + argsStr.split("\n").map(l => "    " + l).join("\n") + COLORS.RESET + "\n");
    });

    pi.on("tool_execution_update", async (event) => {
        const streamFlag = pi.getFlag("stream") || "off";
        if (!streamFlag.includes("tools") && !streamFlag.includes("all")) return;
        if (hasActiveTool) {
             process.stderr.write("\x1b[1A\x1b[2K\r"); // Overwrite the previous running line
        }
        hasActiveTool = true;
        const size = event.partialResult ? JSON.stringify(event.partialResult).length : 0;
        process.stderr.write(`${COLORS.TOOL}  [running...] ${size} bytes received${COLORS.RESET}\n`);
    });

    pi.on("tool_execution_end", async (event) => {
        const streamFlag = pi.getFlag("stream") || "off";
        if (!streamFlag.includes("tools") && !streamFlag.includes("all")) return;
        if (hasActiveTool) {
             process.stderr.write("\x1b[1A\x1b[2K\r"); // Clear the running line
        }
        hasActiveTool = false;
        
        const outColor = event.isError ? COLORS.ERROR : COLORS.TOOL;
        const label = event.isError ? `TOOL ERROR: ${event.toolName}` : `TOOL RESULT: ${event.toolName}`;
        logHeader(outColor, label);
        process.stderr.write(outColor + formatToolOutput(event.result) + COLORS.RESET + "\n\n");
    });
}
