import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { meterFraction, type MeterReading, type ShipInspectorData } from './shipInspectorModel'
import { signedGaugeGeometry } from './motionGauge'
import './shipInspector.css'

type Fact = { label: string; value: string }

function formatValue(value: number | null, digits = 0) {
  return value === null ? '—' : value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function Gauge({ label, reading, tone, digits = 0 }: {
  label: string
  reading: MeterReading
  tone: 'shield' | 'armor' | 'structure'
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

function motionFraction(reading: MeterReading) {
  return meterFraction({ current: reading.current === null ? null : Math.abs(reading.current), maximum: reading.maximum })
}

function pointAt(degrees: number, radius: number) {
  const radians = degrees * Math.PI / 180
  return { x: 80 + Math.cos(radians) * radius, y: 80 + Math.sin(radians) * radius }
}

type DialFrame = {
  velocityX: number
  velocityY: number
  accelerationX: number
  accelerationY: number
  heading: number
  targetHeading: number
  targetOpacity: number
}

function shortestTurn(from: number, to: number) {
  return ((to - from + 540) % 360) - 180
}

function makeDialFrame(data: ShipInspectorData): DialFrame {
  const velocity = pointAt(data.velocityDirectionDegrees ?? 0, 50 * motionFraction(data.speed))
  const acceleration = pointAt(data.accelerationDirectionDegrees ?? 0, 50 * motionFraction(data.acceleration))
  return {
    velocityX: velocity.x,
    velocityY: velocity.y,
    accelerationX: acceleration.x,
    accelerationY: acceleration.y,
    heading: data.headingDegrees ?? 0,
    targetHeading: data.targetHeadingDegrees ?? data.headingDegrees ?? 0,
    targetOpacity: data.targetHeadingDegrees === null ? 0 : 1,
  }
}

function useSmoothedDial(data: ShipInspectorData): DialFrame {
  const target = useMemo(() => makeDialFrame(data), [data])
  const [frame, setFrame] = useState(target)
  const current = useRef(target)
  const destination = useRef(target)
  const animation = useRef<number | null>(null)
  const lastTime = useRef<number | null>(null)

  useEffect(() => {
    destination.current = target.targetOpacity === 0
      ? { ...target, targetHeading: current.current.targetHeading }
      : target

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (animation.current !== null) cancelAnimationFrame(animation.current)
      animation.current = null
      lastTime.current = null
      current.current = destination.current
      setFrame(destination.current)
      return
    }
    if (animation.current !== null) return

    const tick = (time: number) => {
      const elapsed = lastTime.current === null ? 16 : Math.min(50, time - lastTime.current)
      lastTime.current = time
      const blend = 1 - Math.exp(-elapsed / 35)
      const previous = current.current
      const goal = destination.current
      const next: DialFrame = {
        velocityX: previous.velocityX + (goal.velocityX - previous.velocityX) * blend,
        velocityY: previous.velocityY + (goal.velocityY - previous.velocityY) * blend,
        accelerationX: previous.accelerationX + (goal.accelerationX - previous.accelerationX) * blend,
        accelerationY: previous.accelerationY + (goal.accelerationY - previous.accelerationY) * blend,
        heading: previous.heading + shortestTurn(previous.heading, goal.heading) * blend,
        targetHeading: previous.targetHeading + shortestTurn(previous.targetHeading, goal.targetHeading) * blend,
        targetOpacity: previous.targetOpacity + (goal.targetOpacity - previous.targetOpacity) * blend,
      }
      const settled = Math.abs(next.velocityX - goal.velocityX) < 0.01
        && Math.abs(next.velocityY - goal.velocityY) < 0.01
        && Math.abs(next.accelerationX - goal.accelerationX) < 0.01
        && Math.abs(next.accelerationY - goal.accelerationY) < 0.01
        && Math.abs(shortestTurn(next.heading, goal.heading)) < 0.05
        && Math.abs(shortestTurn(next.targetHeading, goal.targetHeading)) < 0.05
        && Math.abs(next.targetOpacity - goal.targetOpacity) < 0.01
      current.current = settled ? goal : next
      setFrame(current.current)
      animation.current = settled ? null : requestAnimationFrame(tick)
      if (settled) lastTime.current = null
    }
    animation.current = requestAnimationFrame(tick)
  }, [target])

  useEffect(() => () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    animation.current = null
    lastTime.current = null
  }, [])

  return frame
}

function MotionGauge({ label, reading, tone }: {
  label: string
  reading: MeterReading
  tone: 'speed' | 'acceleration' | 'angular-speed' | 'angular-acceleration'
}) {
  const isAngular = tone === 'angular-speed' || tone === 'angular-acceleration'
  const signedGeometry = isAngular ? signedGaugeGeometry(reading) : null
  const percentage = signedGeometry?.magnitudePercent ?? Math.round(motionFraction(reading) * 100)
  const trackStyle = signedGeometry ? {
    '--gauge-fill': `${signedGeometry.fillPercent}%`,
    '--gauge-left': `${signedGeometry.leftPercent}%`,
    '--gauge-position': `${signedGeometry.positionPercent}%`
  } as CSSProperties : undefined
  return <div className={`ship-motion-gauge ship-motion-gauge--${tone}${isAngular ? ' ship-motion-gauge--signed' : ''}`}>
    <div className="ship-motion-gauge-caption"><span>{label}</span><strong>{formatValue(reading.current, 2)}</strong></div>
    <div className="ship-motion-gauge-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-valuetext={formatValue(reading.current, 2)} data-reading={reading.current !== null && reading.maximum !== null && reading.maximum > 0} style={trackStyle}>
      <span className="ship-motion-gauge-fill" style={isAngular ? undefined : { '--gauge-fill': `${percentage}%` } as CSSProperties} />
    </div>
  </div>
}

/** World-map angles use 0° east and 90° screen-south. */
function MotionDial({ data }: { data: ShipInspectorData }) {
  const frame = useSmoothedDial(data)
  const heading = data.headingDegrees === null ? null : pointAt(frame.heading, 64)
  const target = pointAt(frame.targetHeading, 64)
  const turn = shortestTurn(frame.heading, frame.targetHeading)
  const arc = heading && frame.targetOpacity > 0.01 && Math.abs(turn) > 0.1
    ? `M ${heading.x} ${heading.y} A 64 64 0 0 ${turn > 0 ? 1 : 0} ${target.x} ${target.y}`
    : null
  return <div className="ship-motion-layout">
    <svg className="ship-motion-dial" viewBox="0 0 160 160" role="img" aria-label={`速度方向 ${data.velocityDirectionDegrees === null ? '静止' : `${formatValue(data.velocityDirectionDegrees, 1)} 度`}，加速度方向 ${data.accelerationDirectionDegrees === null ? '无' : `${formatValue(data.accelerationDirectionDegrees, 1)} 度`}，当前朝向 ${data.headingDegrees === null ? '未知' : `${formatValue(data.headingDegrees, 1)} 度`}，目标朝向 ${data.targetHeadingDegrees === null ? '无' : `${formatValue(data.targetHeadingDegrees, 1)} 度`}`}>
      <circle className="ship-motion-dial-face" cx="80" cy="80" r="57" />
      <circle className="ship-motion-dial-guide" cx="80" cy="80" r="26" />
      <circle className="ship-motion-dial-guide" cx="80" cy="80" r="51" />
      {Array.from({ length: 36 }, (_, index) => <line key={index} className={`ship-motion-tick${index % 3 === 0 ? ' ship-motion-tick--major' : ''}`} x1="80" y1="8" x2="80" y2={index % 3 === 0 ? '19' : '15'} transform={`rotate(${index * 10} 80 80)`} />)}
      {arc && <path className="ship-motion-target-arc" d={arc} opacity={frame.targetOpacity} />}
      <circle className="ship-motion-origin" cx="80" cy="80" r="2" />
      <circle className="ship-motion-dot ship-motion-dot--speed" cx={frame.velocityX} cy={frame.velocityY} r="5" />
      <circle className="ship-motion-dot ship-motion-dot--acceleration" cx={frame.accelerationX} cy={frame.accelerationY} r="3.5" />
      {heading && <circle className="ship-motion-dot ship-motion-dot--heading" cx={heading.x} cy={heading.y} r="4" />}
    </svg>
    <div className="ship-motion-gauges">
      <MotionGauge label="速度" reading={data.speed} tone="speed" />
      <MotionGauge label="加速度" reading={data.acceleration} tone="acceleration" />
      <MotionGauge label="角速度" reading={data.angularSpeed} tone="angular-speed" />
      <MotionGauge label="角加速度" reading={data.angularAcceleration} tone="angular-acceleration" />
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
      <MotionDial data={data} />
    </section>

    <section className="ship-detail-section">
      <h3>耐久 <small>HIT POINTS</small></h3>
      <Gauge label="护盾 HP" reading={data.shield} tone="shield" />
      <Gauge label="装甲 HP" reading={data.armor} tone="armor" />
      <Gauge label="结构 HP" reading={data.structure} tone="structure" />
    </section>

    <section className="ship-detail-section ship-detail-section-auxiliary">
      <h3>位置与识别 <small>REFERENCE</small></h3>
      {facts.map((fact) => <DetailRow key={fact.label} {...fact} />)}
    </section>
  </div>
}
