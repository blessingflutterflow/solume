export default function AboutPage() {
  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-white text-lg font-semibold mb-1">About Solune</h1>
      <p className="text-[#888888] text-sm mb-8">
        Solune Cloud is built on open-source software. We are grateful to the projects listed below.
      </p>

      <div className="flex flex-col gap-4">
        {/* Hermes Agent */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-white text-sm font-semibold">Hermes Agent</h2>
              <p className="text-[#555555] text-xs mt-0.5">NousResearch</p>
            </div>
            <span className="text-[#faff69] text-xs font-mono bg-[#faff69]/10 px-2 py-0.5 rounded shrink-0">
              MIT License
            </span>
          </div>
          <p className="text-[#888888] text-sm leading-relaxed">
            The AI agent that powers your Solune instance. Hermes handles conversations, tool execution,
            memory, and channel integrations. Each Solune client runs a dedicated Hermes instance on
            isolated infrastructure.
          </p>
          <p className="text-[#555555] text-xs mt-3">
            Copyright © NousResearch. Used under the MIT License. No modifications to the agent core.
          </p>
        </div>

        {/* Hermes Web UI */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-white text-sm font-semibold">Hermes Web UI</h2>
              <p className="text-[#555555] text-xs mt-0.5">nesquena / hermes-webui contributors</p>
            </div>
            <span className="text-[#faff69] text-xs font-mono bg-[#faff69]/10 px-2 py-0.5 rounded shrink-0">
              MIT License
            </span>
          </div>
          <p className="text-[#888888] text-sm leading-relaxed">
            The browser-based interface that Solune deploys alongside Hermes Agent on each client instance.
            It provides the streaming chat interface and session management that the Solune chat page
            connects to via a secure proxy.
          </p>
          <p className="text-[#555555] text-xs mt-3">
            Copyright © nesquena and contributors. Used under the MIT License. Deployed unmodified;
            Solune adds a reverse proxy layer for authentication and routing.
          </p>
        </div>

        {/* MIT License text */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-[12px] p-5">
          <h3 className="text-[#555555] text-xs font-semibold uppercase tracking-wider mb-3">MIT License (full text)</h3>
          <pre className="text-[#444444] text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
{`Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
          </pre>
        </div>
      </div>

      <p className="text-[#333333] text-xs mt-6">
        Solune Cloud — &copy; {new Date().getFullYear()} Solune (Pty) Ltd. All rights reserved.
      </p>
    </div>
  );
}
