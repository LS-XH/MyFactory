import type { CSSProperties } from 'react'
import { meterFraction, type MeterReading, type ShipInspectorData } from './shipInspectorModel'
import './shipInspector.css'

type Fact = { label: string; value: string }

function formatValue(value: number | null, digits = 0) {
  return value === null ? '—' : value.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

function Gauge({ label, reading, tone, digits = 0 }: {
  label: string
  reading: MeterReading
  tone: 'speed' | 'shield' | 'armor' | 'structure'
  digits?: number
}) {
  const percentage = Math.round(meterFraction(reading) * 100)
  return <div className={`ship-gauge ship-gauge-${tone}`}>
    <div className="ship-gauge-caption"><span>{label}</span><strong>{formatValue(reading.current, digits)} <em>/</em> {formatValue(reading.maximum, digits)}</strong></div>
    <div className="ship-gauge-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
      <span className="ship-gauge-fill" style={{ '--gauge-fill': `${percentage}%` } as CSSProperties} />
    </div>
  </div>
}

/** Heading follows the movement engine: 0° points east, 90° points screen-south. */
function HeadingCompass({ degrees }: { degrees: number | null }) {
  const rotation = degrees ?? 0
  return <div className="ship-heading">
    <svg className="ship-compass" viewBox="0 0 96 96" role="img" aria-label={degrees === null ? '朝向未知' : `朝向 ${formatValue(degrees, 1)} 度`}>
      <circle className="ship-compass-outer" cx="48" cy="48" r="32" />
      <circle className="ship-compass-inner" cx="48" cy="48" r="23" />
      <path className="ship-compass-cross" d="M48 20v7m0 42v7M20 48h7m42 0h7" />
      <text x="48" y="11" textAnchor="middle">N</text>
      <text x="86" y="51" textAnchor="middle">E</text>
      <text x="48" y="91" textAnchor="middle">S</text>
      <text x="10" y="51" textAnchor="middle">W</text>
      {degrees !== null && <g transform={`rotate(${rotation} 48 48)`}>
        <path className="ship-compass-needle" d="M48 45 73 48 48 51 52 48Z" />
      </g>}
      <circle className="ship-compass-center" cx="48" cy="48" r="2.5" />
    </svg>
    <div className="ship-heading-value">
      <span>朝向角度</span>
      <strong>{degrees === null ? '—' : `${formatValue(degrees, 1)}°`}</strong>
      <small>0° 东 · 90° 南</small>
    </div>
  </div>
}

function DetailRow({ label, value }: Fact) {
  return <div className="ship-detail-row"><span>{label}</span><strong title={value}>{value}</strong></div>
}

export function ShipInspector({ data, facts }: { data: ShipInspectorData; facts: Fact[] }) {
  return <div className="ship-inspector">
    <section className="ship-detail-section">
      <h3>飞船资料 <small>IDENTIFICATION</small></h3>
      <DetailRow label="舰型" value={data.typeName} />
      <DetailRow label="舰船型号" value={data.modelName} />
      <DetailRow label="型号 ID" value={data.modelId} />
      <DetailRow label="生产商" value={data.manufacturerName} />
      <DetailRow label="所属势力" value={data.ownerFactionName} />
    </section>

    <section className="ship-detail-section">
      <h3>运动 <small>MOTION</small></h3>
      <Gauge label="速度" reading={data.speed} tone="speed" digits={1} />
      <HeadingCompass degrees={data.headingDegrees} />
    </section>

    <section className="ship-detail-section">
      <h3>耐久 <small>HIT POINTS</small></h3>
      <Gauge label="护盾 HP" reading={data.shield} tone="shield" />
      <Gauge label="船体 HP" reading={data.armor} tone="armor" />
      <Gauge label="结构 HP" reading={data.structure} tone="structure" />
    </section>

    <section className="ship-detail-section ship-detail-section-auxiliary">
      <h3>位置与识别 <small>REFERENCE</small></h3>
      {facts.map((fact) => <DetailRow key={fact.label} {...fact} />)}
    </section>
  </div>
}
