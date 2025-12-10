// src/App.tsx
import { useEffect, useState } from "react"
import { CitationGraph } from "./components/CitationGraph"
import { T2Dashboard } from "./components/T2Dashboard"
import { CitationGraphRadialBundled } from "./components/CitationGraphRadialBundled"
import { ChatWithLLM } from "./components/ChatWithLLM"
import { AuthorNetwork } from "./components/AuthorNetwork"



// 后端返回的数据结构
export interface GraphNode {
  id: string
  label?: string
  year?: number
  patent_count?: number
  doctype?: string
  h_index?: number
  productivity?: number
}

export interface GraphLink {
  source: string
  target: string
  weight?: number
}

interface CitationNetworkResponse {
  nodes: GraphNode[]
  links: GraphLink[]
  meta?: {
    min_year?: number
    max_year?: number
    years_window?: number
    n_nodes?: number
    n_links?: number
  }
}

function App() {
  const [data, setData] = useState<CitationNetworkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch("/api/citation_network")
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = (await res.json()) as CitationNetworkResponse
        setData(json)
      } catch (err: any) {
        console.error("Failed to fetch citation network:", err)
        setError(err.message ?? "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])
  
  return (
    <div
      style={{
        padding: "16px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <h1>Sci-Vis: Citation Network</h1>
  
      {loading && <p>Loading citation network from Flask backend...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
  
      {/* 有数据时再渲染图 */}
      {data && (
        <>
          <p style={{ color: "#555" }}>
            Showing {data.meta?.n_nodes ?? data.nodes.length} nodes and{" "}
            {data.meta?.n_links ?? data.links.length} links.
          </p>
  
          {/* 论文引用网络 */}
          <CitationGraph nodes={data.nodes} links={data.links} />
          {/* 作者协作网络 */}
          <AuthorNetwork />
          {/* <CitationGraphRadialBundled nodes={data.nodes} links={data.links} /> */}
          <T2Dashboard />
  

  
          {/* meta 调试信息 */}
          {/* <h2 style={{ marginTop: "16px" }}>Meta</h2> */}

  
          {/* Project 2：LLM + Vega-Lite 可视化模块 */}
          <ChatWithLLM />
        </>
      )}
    </div>
  )
  


}

export default App
