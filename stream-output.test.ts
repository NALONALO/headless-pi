import headlessStreamingExtension from './stream-output';

describe('headlessStreamingExtension', () => {
    let pi: any;
    let flags: Record<string, any> = {};
    let eventListeners: Record<string, (event: any) => Promise<void> | void> = {};
    let stderrSpy: jest.SpyInstance;

    beforeEach(() => {
        flags = {};
        eventListeners = {};
        pi = {
            registerFlag: jest.fn((name, opts) => {
                flags[name] = opts.default;
            }),
            getFlag: jest.fn((name) => flags[name]),
            on: jest.fn((event, listener) => {
                eventListeners[event] = listener;
            })
        };

        stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should register stream flag', () => {
        headlessStreamingExtension(pi);
        expect(pi.registerFlag).toHaveBeenCalledWith('stream', expect.any(Object));
    });

    it('should output nothing if stream flag is off', async () => {
        headlessStreamingExtension(pi);
        flags['stream'] = 'off';

        if (eventListeners['message_update']) {
            await eventListeners['message_update']({
                assistantMessageEvent: { type: 'text_start' }
            });
        }
        expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should output text message but not thinking or tools when stream flag is message', async () => {
        headlessStreamingExtension(pi);
        flags['stream'] = 'message';

        if (eventListeners['message_update']) {
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_delta', delta: 'hmm' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
        }
        if (eventListeners['tool_execution_start']) {
            await eventListeners['tool_execution_start']({ toolName: 'testTool', args: { foo: 'bar' } });
        }
        
        const output = stderrSpy.mock.calls.map(c => c[0]).join('');
        expect(output).toContain('MESSAGE');
        expect(output).toContain('hello');
        expect(output).not.toContain('THINKING');
        expect(output).not.toContain('testTool');
    });

    it('should output tool execution events but not messages or thinking when stream flag is tools', async () => {
        headlessStreamingExtension(pi);
        flags['stream'] = 'tools';

        if (eventListeners['message_update']) {
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_delta', delta: 'hmm' } });
        }
        if (eventListeners['tool_execution_start']) {
            await eventListeners['tool_execution_start']({ toolName: 'testTool', args: { foo: 'bar' } });
        }
        
        const output = stderrSpy.mock.calls.map(c => c[0]).join('');
        expect(output).toContain('CALLING TOOL: testTool');
        expect(output).not.toContain('MESSAGE');
        expect(output).not.toContain('hello');
        expect(output).not.toContain('THINKING');
    });

    it('should output thinking but not messages or tools when stream flag is thinking', async () => {
        headlessStreamingExtension(pi);
        flags['stream'] = 'thinking';

        if (eventListeners['message_update']) {
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_delta', delta: 'hmm' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
        }
        if (eventListeners['tool_execution_start']) {
            await eventListeners['tool_execution_start']({ toolName: 'testTool', args: { foo: 'bar' } });
        }
        
        const output = stderrSpy.mock.calls.map(c => c[0]).join('');
        expect(output).toContain('THINKING');
        expect(output).toContain('hmm');
        expect(output).not.toContain('MESSAGE');
        expect(output).not.toContain('hello');
        expect(output).not.toContain('testTool');
    });

    it('should output all events when stream flag is all', async () => {
        headlessStreamingExtension(pi);
        flags['stream'] = 'all';

        if (eventListeners['message_update']) {
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'thinking_delta', delta: 'hmm' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_start' } });
            await eventListeners['message_update']({ assistantMessageEvent: { type: 'text_delta', delta: 'hello' } });
        }
        if (eventListeners['tool_execution_start']) {
            await eventListeners['tool_execution_start']({ toolName: 'testTool', args: { foo: 'bar' } });
        }
        
        const output = stderrSpy.mock.calls.map(c => c[0]).join('');
        expect(output).toContain('THINKING');
        expect(output).toContain('hmm');
        expect(output).toContain('MESSAGE');
        expect(output).toContain('hello');
        expect(output).toContain('CALLING TOOL: testTool');
    });
});
