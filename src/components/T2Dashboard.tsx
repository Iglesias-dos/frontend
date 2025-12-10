import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface YearItem {
  year: number
  count: number
}

interface PatentCountsResponse {
  year: number
  patent_counts: number[]
  meta?: {
    n_papers?: number
    dummy?: boolean
  }
}

export function T2Dashboard() {
  const [yearsData, setYearsData] = useState<YearItem[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [patentValues, setPatentValues] = useState<number[]>([])

  const timelineRef = useRef<SVGSVGElement | null>(null)
  const histRef = useRef<SVGSVGElement | null>(null)

  // 1. 调用 /papers_by_year 获得最近 10 年论文数量
  useEffect(() => {
    const fetchYears = async () => {
      const res = await fetch("/api/papers_by_year?last_n=10")
      const json = (await res.json()) as YearItem[]
      setYearsData(json)

      if (json.length > 0) {
        const maxYear = d3.max(json, (d) => d.year)!
        setSelectedYear(maxYear)
      }
    }
    fetchYears()
  }, [])

  // 2. 点击年份后调用 /patent_counts
  useEffect(() => {
    if (selectedYear == null) return

    const fetchCounts = async () => {
      const res = await fetch(`/api/patent_counts?year=${selectedYear}`)
      const json = (await res.json()) as PatentCountsResponse
      setPatentValues(json.patent_counts ?? [])
    }
    fetchCounts()
  }, [selectedYear])

  // 3. D3 绘制时间轴条形图
  useEffect(() => {
    if (!timelineRef.current || yearsData.length === 0) return

    const svg = d3.select(timelineRef.current)
    svg.selectAll("*").remove()

    const width = 800
    const height = 240
    const margin = { top: 20, right: 20, bottom: 40, left: 50 }

    svg.attr("viewBox", `0 0 ${width} ${height}`)

    const x = d3
      .scaleBand()
      .domain(yearsData.map((d) => d.year))
      .range([margin.left, width - margin.right])
      .padding(0.2)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(yearsData, (d) => d.count) ?? 0])
      .nice()
      .range([height - margin.bottom, margin.top])

    const g = svg.append("g")

    // x 轴
    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((d) => d.toString()))

    // y 轴
    g.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))

    // 条形图
    g.selectAll("rect.bar")
      .data(yearsData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.year)!)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d.count))
      .attr("fill", (d) => (d.year === selectedYear ? "#ff7f0e" : "#3182bd"))
      .style("cursor", "pointer")
      .on("click", (_, d) => setSelectedYear(d.year))
      .append("title")
      .text((d) => `${d.year}: ${d.count} papers`)

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .text("Papers Per Year (Last 10 Years)")
  }, [yearsData, selectedYear])

  // 4. D3 绘制 patent histogram
  useEffect(() => {
    if (!histRef.current) return

    const svg = d3.select(histRef.current)
    svg.selectAll("*").remove()

    const width = 800
    const height = 260
    const margin = { top: 20, right: 20, bottom: 40, left: 50 }

    svg.attr("viewBox", `0 0 ${width} ${height}`)

    if (patentValues.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No Patent_Count data for this year")
      return
    }

    // 构建 scale
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(patentValues) ?? 0])
      .nice()
      .range([margin.left, width - margin.right])

    const bins = d3
      .bin()
      .domain(x.domain() as [number, number])
      .thresholds(15)(patentValues)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length) ?? 0])
      .nice()
      .range([height - margin.bottom, margin.top])

    const g = svg.append("g")

    // 绘制每个 bin
    g.selectAll("rect.hist")
      .data(bins)
      .join("rect")
      .attr("class", "hist")
      .attr("x", (d) => x(d.x0!))
      .attr("y", (d) => y(d.length))
      .attr("width", (d) => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
      .attr("height", (d) => y(0) - y(d.length))
      .attr("fill", "#6baed6")
      .append("title")
      .text((d) => `[${d.x0}, ${d.x1}): ${d.length} papers`)

    // x 轴
    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))

    // y 轴
    g.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))

    // 标题
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", "bold")
      .text(`Patent_Count Distribution for Year ${selectedYear}`)
  }, [patentValues, selectedYear])

  return (
    <div style={{ marginTop: "24px" }}>
      <h2>T2: Timeline + Patent Histogram</h2>

      <svg
        ref={timelineRef}
        style={{
          width: "100%",
          height: "240px",
          border: "1px solid #ddd",
          background: "#fafafa",
          marginBottom: "16px",
        }}
      />

      <svg
        ref={histRef}
        style={{
          width: "100%",
          height: "260px",
          border: "1px solid #ddd",
          background: "#fafafa",
        }}
      />
    </div>
  )
}
