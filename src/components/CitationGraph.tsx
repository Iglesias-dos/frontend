// src/components/CitationGraph.tsx
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { GraphNode, GraphLink } from "../App"

// 把后端的节点类型扩展成 D3 需要的 SimulationNodeDatum
interface NodeDatum extends d3.SimulationNodeDatum, GraphNode {}
interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum>, GraphLink {}

// 组件的 props：从 App 接收 nodes 和 links
interface CitationGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function CitationGraph({ nodes, links }: CitationGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    if (!nodes.length || !links.length) return

    // ---- 1. 准备绘图数据副本（不要直接修改 props） ----
    const simNodes: NodeDatum[] = nodes.map((d) => ({ ...d }))
    const simLinks: LinkDatum[] = links.map((d) => ({ ...d }))

    // 可选：如果节点太多，可以只取前 300 个，避免一开始太卡
    const MAX_NODES = Infinity
    let filteredNodes = simNodes
    let filteredLinks = simLinks

    if (simNodes.length > MAX_NODES) {
      const keepIds = new Set(simNodes.slice(0, MAX_NODES).map((d) => d.id))
      filteredNodes = simNodes.filter((d) => keepIds.has(d.id))
      filteredLinks = simLinks.filter(
        (l) =>
          typeof l.source === "string" &&
          typeof l.target === "string" &&
          keepIds.has(l.source) &&
          keepIds.has(l.target)
      )
    }

    const width = 900
    const height = 600

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const g = svg.append("g")

    // ---- 2. 颜色：按年份映射 ----
    const years = filteredNodes
      .map((d) => d.year)
      .filter((y): y is number => typeof y === "number")

    const yearMin = years.length ? d3.min(years)! : 2020
    const yearMax = years.length ? d3.max(years)! : 2025

    const colorScale = d3
      .scaleSequential(d3.interpolateTurbo)
      .domain([yearMin, yearMax])

    // ---- 3. 节点大小：按 Patent_Count 映射 ----
    const patentCounts = filteredNodes.map((d) => d.patent_count ?? 0)
    const patentMax = d3.max(patentCounts) ?? 0

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, Math.max(1, patentMax)])
      .range([4, 14])

    // ---- 4. 画边 ----
    const linkSelection = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke-width", 1)

    // ---- 5. 画节点 ----
    const nodeSelection = g
      .append("g")
      .selectAll("circle")
      .data(filteredNodes)
      .join("circle")
      .attr("r", (d) => radiusScale(d.patent_count ?? 0))
      .attr("fill", (d) =>
        typeof d.year === "number" ? colorScale(d.year) : "#888"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8)

    // tooltip：悬停显示一些信息
    nodeSelection
      .append("title")
      .text(
        (d) =>
          `${d.label ?? d.id}\nYear: ${d.year ?? "NA"}\nPatent_Count: ${
            d.patent_count ?? 0
          }`
      )

    // ---- 6. 拖拽 ----
    const drag = d3
      .drag<SVGCircleElement, NodeDatum>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeSelection.call(drag as any)

    // ---- 7. 力导向布局 ----
    const simulation = d3
      .forceSimulation<NodeDatum>(filteredNodes)
      .force(
        "link",
        d3
          .forceLink<NodeDatum, LinkDatum>(filteredLinks)
          .id((d) => d.id)
          .distance(60)
      )
      .force("charge", d3.forceManyBody().strength(-60))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(16))
      .on("tick", () => {
        linkSelection
          .attr("x1", (d) =>
            typeof d.source === "string" ? 0 : d.source.x ?? 0
          )
          .attr("y1", (d) =>
            typeof d.source === "string" ? 0 : d.source.y ?? 0
          )
          .attr("x2", (d) =>
            typeof d.target === "string" ? 0 : d.target.x ?? 0
          )
          .attr("y2", (d) =>
            typeof d.target === "string" ? 0 : d.target.y ?? 0
          )

        nodeSelection
          .attr("cx", (d) => d.x ?? 0)
          .attr("cy", (d) => d.y ?? 0)
      })

    // ---- 8. 缩放 ----
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })

    svg.call(zoom as any)

    // ---- 9. 清理 ----
    return () => {
      simulation.stop()
    }
  }, [nodes, links]) // 当数据变化时，重新渲染

  return (
    <div style={{ marginTop: "16px" }}>
      <h2>Force-Directed Citation Graph (real data)</h2>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      />
      <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
        Node color = publication year; node size = Patent_Count (patent
        citations).
      </p>
    </div>
  )
}
