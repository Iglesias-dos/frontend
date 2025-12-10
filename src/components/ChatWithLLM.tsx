// src/components/ChatWithLLM.tsx
import React, { useState } from "react"
import vegaEmbed from "vega-embed"

interface ChatResponse {
  filter_text: string
  analysis_text: string
  chart_spec: any
}

export const ChatWithLLM: React.FC = () => {
  const [message, setMessage] = useState(
    "show me the number of papers by year from 2015 to 2020"
  )
  const [filterText, setFilterText] = useState("")
  const [analysisText, setAnalysisText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }

      const data: ChatResponse = await resp.json()

      setFilterText(data.filter_text)
      setAnalysisText(data.analysis_text)

      // 用 Vega-Lite 渲染图
      if (data.chart_spec) {
        await vegaEmbed("#llm-vis", data.chart_spec, { actions: false })
      }
    } catch (e: any) {
      setError(e.message ?? "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: "flex",
        marginTop: "24px",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #ddd",
        gap: "16px",
      }}
    >
      {/* 左边：聊天 + 文本说明 */}
      <div style={{ flexBasis: "35%", minWidth: "280px" }}>
        <h2>Project 2 · LLM + Vega-Lite</h2>
        <textarea
          style={{ width: "100%", height: "100px", boxSizing: "border-box" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{ marginTop: "8px", padding: "6px 12px" }}
        >
          {loading ? "Thinking..." : "Send"}
        </button>

        {error && (
          <div style={{ color: "red", marginTop: "8px" }}>Error: {error}</div>
        )}

        <h3 style={{ marginTop: "16px" }}>Filter summary</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>{filterText}</pre>

        <h3>Analysis summary</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>{analysisText}</pre>
      </div>

      {/* 右边：Vega-Lite 图 */}
      <div style={{ flex: 1 }}>
        <h3>Visualization (Vega-Lite)</h3>
        <div id="llm-vis" />
      </div>
    </div>
  )
}
