// src/components/CitationGraphRadialBundled.tsx
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { GraphNode, GraphLink } from "../App"

interface NodeDatum extends GraphNode {
  x?: number
  y?: number
  radius?: number
  angle?: number
}

interface LinkDatum extends GraphLink {
  source: NodeDatum
  target: NodeDatum
}

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function CitationGraphRadialBundled({ nodes, links }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current) return
    if (!nodes.length || !links.length) return

    const width = 900
    const height = 600
    const cx = width / 2
    const cy = height / 2

    // 1. 准备节点数据副本
    const nodeData: NodeDatum[] = nodes.map((d) => ({ ...d }))
    const nodeById = new Map<string, NodeDatum>(
      nodeData.map((d) => [d.id, d])
    )

    // 2. 处理年份，构建 “年份 → 节点组” 和 radial 布局
    const years = Array.from(
      new Set(
        nodeData
          .map((d) => d.year)
          .filter((y): y is number => typeof y === "number")
      )
    ).sort((a, b) => a - b)

    const yearMin = years.length ? d3.min(years)! : 2020
    const yearMax = years.length ? d3.max(years)! : 2025

    // 不同年份在半径方向上有不同的环（hierarchy）
    const radialScale = d3
      .scaleLinear()
      .domain([yearMin, yearMax])
      .range([120, 260])

    // 每个年份占用一个角度扇区
    const yearAngleScale = d3
      .scaleBand<number>()
      .domain(years)
      .range([0, 2 * Math.PI])
      .paddingInner(0.1)

    // 按年份分组
    const nodesByYear = new Map<number, NodeDatum[]>()
    for (const n of nodeData) {
      if (typeof n.year !== "number") continue
      if (!nodesByYear.has(n.year)) nodesByYear.set(n.year, [])
      nodesByYear.get(n.year)!.push(n)
    }

    // 为每个节点分配 (radius, angle) → (x, y)
    for (const year of years) {
      const group = nodesByYear.get(year) ?? []
      if (!group.length) continue

      const startAngle = yearAngleScale(year)!
      const endAngle = startAngle + yearAngleScale.bandwidth()
      const r = radialScale(year)

      group.forEach((n, i) => {
        const t = (i + 0.5) / group.length
        const angle = startAngle + t * (endAngle - startAngle)
        n.angle = angle
        n.radius = r
        n.x = cx + r * Math.cos(angle)
        n.y = cy + r * Math.sin(angle)
      })
    }

    // 3. 计算每个年份的“中心点”（用于 edge bundling 的控制点）
    const yearCenters = new Map<number, { x: number; y: number }>()
    for (const year of years) {
      const group = nodesByYear.get(year) ?? []
      if (!group.length) continue
      const avgX = d3.mean(group, (d) => d.x ?? cx) ?? cx
      const avgY = d3.mean(group, (d) => d.y ?? cy) ?? cy
      yearCenters.set(year, { x: avgX, y: avgY })
    }

    // 4. 准备 link 数据，保证 source/target 都是 NodeDatum
    const linkData: LinkDatum[] = links
      .map((l) => {
        const sId = typeof l.source === "string" ? l.source : l.source
        const tId = typeof l.target === "string" ? l.target : l.target
        const sNode = nodeById.get(sId as string)
        const tNode = nodeById.get(tId as string)
        if (!sNode || !tNode) return null
        return {
          ...l,
          source: sNode,
          target: tNode,
        } as LinkDatum
      })
      .filter((d): d is LinkDatum => d !== null)

    // 5. 颜色 & 尺寸 scale（与 force 图保持一致语义）
    const colorScale = d3
      .scaleSequential(d3.interpolateTurbo)
      .domain([yearMin, yearMax])

    const patentCounts = nodeData.map((d) => d.patent_count ?? 0)
    const patentMax = d3.max(patentCounts) ?? 0

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, Math.max(1, patentMax)])
      .range([4, 14])

    // 6. 开始画图
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const g = svg.append("g")

    // 6.1 画年份 ring（可选，增强层次感）
    const ringGroup = g.append("g").attr("class", "rings")
    ringGroup
      .selectAll("circle.year-ring")
      .data(years)
      .join("circle")
      .attr("class", "year-ring")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", (year) => radialScale(year))
      .attr("fill", "none")
      .attr("stroke", "#eee")

    // 6.2 画边：使用 quadratic Bézier 曲线做 bundling
    const linkGroup = g.append("g").attr("class", "links")

    const linkSelection = linkGroup
      .selectAll("path.link")
      .data(linkData)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", 0.7)
      .attr("d", (d) => {
        const sx = d.source.x ?? cx
        const sy = d.source.y ?? cy
        const tx = d.target.x ?? cx
        const ty = d.target.y ?? cy

        const syear = typeof d.source.year === "number" ? d.source.year : null
        const tyear = typeof d.target.year === "number" ? d.target.year : null

        let cxCtrl = cx
        let cyCtrl = cy

        if (syear !== null && tyear !== null) {
          const sc = yearCenters.get(syear)
          const tc = yearCenters.get(tyear)
          if (syear === tyear && sc) {
            // 同一年 → 控制点 = 该年中心，边被束在一起
            cxCtrl = sc.x
            cyCtrl = sc.y
          } else if (sc && tc) {
            // 不同年 → 控制点 = 两个年份中心的中点
            cxCtrl = (sc.x + tc.x) / 2
            cyCtrl = (sc.y + tc.y) / 2
          }
        }

        return `M${sx},${sy} Q${cxCtrl},${cyCtrl} ${tx},${ty}`
      })

    // 6.3 画节点
    const nodeGroup = g.append("g").attr("class", "nodes")
    const nodeSelection = nodeGroup
      .selectAll("circle.node")
      .data(nodeData)
      .join("circle")
      .attr("class", "node")
      .attr("cx", (d) => d.x ?? cx)
      .attr("cy", (d) => d.y ?? cy)
      .attr("r", (d) => radiusScale(d.patent_count ?? 0))
      .attr("fill", (d) =>
        typeof d.year === "number" ? colorScale(d.year) : "#888"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.8)

    nodeSelection
      .append("title")
      .text(
        (d) =>
          `${d.label ?? d.id}\nYear: ${d.year ?? "NA"}\nPatent_Count: ${
            d.patent_count ?? 0
          }`
      )

    // 6.4 缩放 / 拖动视图（不是拖动节点，因为布局是固定的）
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString())
      })

    svg.call(zoom as any)

    // 无 forceSimulation，所以无需清理 tick
  }, [nodes, links])

  return (
    <div style={{ marginTop: "24px" }}>
      <h2>Radial Citation Graph with Bundled Edges (T3 refined)</h2>
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
        Radial layout by publication year (rings). Edges are routed via year
        centers to approximate hierarchical edge bundling.
      </p>
    </div>
  )
}
