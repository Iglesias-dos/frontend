// src/components/AuthorNetwork.tsx
import { useEffect, useState } from "react"
import { CitationGraph } from "./CitationGraph"
import type { GraphNode, GraphLink } from "../App"

// 专门为作者协作网络定义一个响应类型
interface AuthorNetworkResponse {
  nodes: GraphNode[]
  links: GraphLink[]
  meta?: {
    top_n?: number
    min_weight?: number
    n_nodes?: number
    n_links?: number
  }
}

export function AuthorNetwork() {
  const [data, setData] = useState<AuthorNetworkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAuthorNetwork = async () => {
      try {
        setLoading(true)
        setError(null)

        // 如果后端 blueprint 是 url_prefix="/api"，这个路径就是对的
        const res = await fetch("/api/author_network?top_n=300&min_weight=1")
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = (await res.json()) as AuthorNetworkResponse
        setData(json)
        console.log("Author network meta:", json.meta)
      } catch (err: any) {
        console.error("Failed to fetch author network:", err)
        setError(err.message ?? "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchAuthorNetwork()
  }, [])

  if (loading) {
    return <p>Loading author collaboration network...</p>
  }

  if (error) {
    return <p style={{ color: "red" }}>Error loading author network: {error}</p>
  }

  if (!data) {
    return <p>No author network data.</p>
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <h2>Author Collaboration Network</h2>
      <p style={{ color: "#555" }}>
        Showing {data.meta?.n_nodes ?? data.nodes.length} authors and{" "}
        {data.meta?.n_links ?? data.links.length} co-authorship links.
      </p>

      <CitationGraph nodes={data.nodes} links={data.links} />

      {/* 如果你想调试 meta，也可以像 citation 那样打印出来 */}
      {/* 
      <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
        {JSON.stringify(data.meta, null, 2)}
      </pre>
      */}
    </div>
  )
}
