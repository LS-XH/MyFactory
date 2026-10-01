#!/usr/bin/env python3
"""Generate a game-ready spaceMap.json using the legacy resource schemas."""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STAR_TYPES = ROOT / "assets" / "legacy" / "starType.json"
DEFAULT_PLANET_TYPES = ROOT / "assets" / "legacy" / "planetType.json"
DEFAULT_OUTPUT = ROOT / "assets" / "legacy" / "spaceMap.json"

STAR_NAMES = [
    ("Solar", "太阳系"), ("AlphaCentauri", "南门二"), ("ProximaCentauri", "比邻星"),
    ("BarnardsStar", "巴纳德星"), ("Sirius", "天狼星"), ("Procyon", "南河三"),
    ("TauCeti", "天仓五"), ("EpsilonEridani", "波江座ε"), ("Vega", "织女星"),
    ("Altair", "河鼓二"), ("Lalande21185", "拉兰德21185"), ("Wolf359", "沃夫359"),
    ("Ross128", "罗斯128"), ("EpsilonIndi", "印第安座ε"), ("61Cygni", "天鹅座61"),
    ("TRAPPIST1", "TRAPPIST-1"), ("GJ581", "格利泽581"), ("GJ876", "格利泽876"),
    ("GJ436", "格利泽436"), ("GJ887", "格利泽887"), ("Kepler22", "开普勒-22"),
    ("Kepler62", "开普勒-62"), ("Kepler186", "开普勒-186"), ("Kepler452", "开普勒-452"),
    ("55Cancri", "巨蟹座55"), ("51Pegasi", "飞马座51"), ("HD20794", "HD 20794"),
    ("Fomalhaut", "北落师门"), ("Arcturus", "大角星"), ("Aldebaran", "毕宿五"),
]
PLANET_NAMES = [
    ("Mercury", "水星"), ("Venus", "金星"), ("Earth", "地球"), ("Mars", "火星"),
    ("Jupiter", "木星"), ("Saturn", "土星"), ("Uranus", "天王星"), ("Neptune", "海王星"),
    ("Kepler", "开普勒"), ("Aurelia", "奥瑞莉亚"), ("Eden", "伊甸"), ("Hestia", "赫斯提亚"),
    ("Nereid", "涅瑞伊得"), ("Borealis", "博雷阿利斯"), ("Cinder", "烬星"), ("Pelagia", "佩拉吉亚"),
]
MOON_NAMES = [
    ("Moon", "月球"), ("Phobos", "福波斯"), ("Deimos", "得摩斯"), ("Io", "木卫一"),
    ("Europa", "木卫二"), ("Ganymede", "木卫三"), ("Callisto", "木卫四"), ("Titan", "土卫六"),
    ("Enceladus", "土卫二"), ("Rhea", "土卫五"), ("Dione", "土卫四"), ("Tethys", "土卫三"),
    ("Oberon", "天卫四"), ("Titania", "天卫三"), ("Triton", "海卫一"), ("Charon", "卡戎"),
]


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"无法读取 JSON 文件 {path}: {exc}") from exc
    if not isinstance(value, dict) or not value:
        raise ValueError(f"JSON 文件必须包含非空对象：{path}")
    return value


def draw_number(mode: str, low: float, high: float, mean: float, std: float) -> float:
    if low > high:
        raise ValueError("最小值不能大于最大值")
    if mode == "uniform":
        return random.uniform(low, high)
    if std <= 0:
        return min(high, max(low, mean))
    for _ in range(1000):
        sample = random.gauss(mean, std)
        if low <= sample <= high:
            return sample
    return min(high, max(low, mean))


def draw_count(mode: str, low: int, high: int, mean: float, std: float) -> int:
    return int(round(draw_number(mode, low, high, mean, std)))


def unique_name(names: list[tuple[str, str]], index: int, prefix: str) -> tuple[str, str]:
    if index < len(names):
        return names[index]
    return f"{prefix}{index + 1:03d}", f"{prefix} {index + 1}"


def prompt_args(args: argparse.Namespace) -> None:
    """Prompt for the generation controls while retaining CLI values as defaults."""
    fields = [
        ("posrange", "恒星系坐标范围（ly）", float), ("minl", "恒星系最小间距（ly）", float),
        ("count", "恒星系数量", int), ("mino", "最小行星轨道（AU）", float),
        ("maxo", "最大行星轨道（AU）", float), ("ro", "行星轨道分布 uniform/normal", str),
        ("roe", "行星轨道期望值", float), ("ros", "行星轨道标准差", float),
        ("minc", "最小行星数量", int), ("maxc", "最大行星数量", int),
        ("rc", "行星数量分布 uniform/normal", str), ("rce", "行星数量期望值", float),
        ("rcs", "相邻行星轨道最小间距（AU）", float), ("moongaps", "相邻卫星轨道最小间距（AU）", float),
        ("minr", "最小天体半径（km）", float), ("maxr", "最大天体半径（km）", float),
        ("rr", "半径分布 uniform/normal", str), ("rre", "半径期望值（km）", float),
        ("rrs", "半径标准差（km）", float),
    ]
    for name, label, converter in fields:
        current = getattr(args, name)
        answer = input(f"{label} [{current}]: ").strip()
        if answer:
            setattr(args, name, converter(answer))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按 starType.json 和 planetType.json 生成 spaceMap.json")
    parser.add_argument("--posrange", type=float, default=100, help="恒星系 x/y 坐标范围（ly），默认 100")
    parser.add_argument("--minl", type=float, default=5, help="恒星系最小间距（ly），默认 5")
    parser.add_argument("--count", type=int, default=100, help="生成恒星系数量，默认 100")
    parser.add_argument("--mino", type=float, default=0.5, help="行星轨道下限（AU），默认 0.5")
    parser.add_argument("--maxo", type=float, default=10, help="行星轨道上限（AU），默认 10")
    parser.add_argument("--ro", choices=("uniform", "normal", "均匀分布", "正态分布"), default="normal", help="行星轨道分布，默认正态分布")
    parser.add_argument("--roe", type=float, default=5, help="行星轨道正态分布期望值，默认 5")
    parser.add_argument("--ros", type=float, default=100, help="行星轨道正态分布标准差，默认 100")
    parser.add_argument("--minc", type=int, default=1, help="每个恒星系最少行星数，默认 1")
    parser.add_argument("--maxc", type=int, default=8, help="每个恒星系最多行星数，默认 8")
    parser.add_argument("--rc", choices=("uniform", "normal", "均匀分布", "正态分布"), default="normal", help="行星数量分布，默认正态分布")
    parser.add_argument("--rce", type=float, default=6, help="行星数量正态分布期望值，默认 6")
    parser.add_argument("--rcs", type=float, default=1, help="行星数量正态分布标准差，默认 1")
    parser.add_argument("--gaps", type=float, default=1, help="相邻行星轨道最小间距（AU），默认 1")
    parser.add_argument("--moon-gaps", "--moongaps", dest="moongaps", type=float, default=0.5, help="相邻卫星轨道最小间距（AU），默认 0.5")
    parser.add_argument("--minr", type=float, default=1000, help="天体半径下限（km），默认 1000")
    parser.add_argument("--maxr", type=float, default=10000, help="天体半径上限（km），默认 10000")
    parser.add_argument("--rr", choices=("uniform", "normal", "均匀分布", "正态分布"), default="normal", help="天体半径分布，默认正态分布")
    parser.add_argument("--rre", type=float, default=5000, help="半径正态分布期望值（km），默认 5000")
    parser.add_argument("--rrs", type=float, default=100, help="半径正态分布标准差（km），默认 100")
    parser.add_argument("--interactive", action="store_true", help="交互式逐项确认/修改生成参数")
    parser.add_argument("--star-types", type=Path, default=DEFAULT_STAR_TYPES, help="starType.json 路径")
    parser.add_argument("--planet-types", type=Path, default=DEFAULT_PLANET_TYPES, help="planetType.json 路径")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="输出文件，默认覆盖 assets/legacy/spaceMap.json")
    parser.add_argument("--seed", type=int, help="随机种子；指定后可复现结果")
    args = parser.parse_args()
    if args.interactive:
        try:
            prompt_args(args)
        except (ValueError, EOFError) as exc:
            parser.error(f"交互参数无效：{exc}")
    for attr, mode in (("ro", "ro"), ("rc", "rc"), ("rr", "rr")):
        if getattr(args, attr) in ("均匀分布", "正态分布"):
            setattr(args, attr, "uniform" if getattr(args, attr) == "均匀分布" else "normal")
    if args.seed is not None:
        random.seed(args.seed)
    return args


def validate(args: argparse.Namespace, star_types: dict[str, Any], planet_types: dict[str, Any]) -> None:
    if args.count < 1 or args.posrange <= 0 or args.minl < 0:
        raise ValueError("count 必须大于 0，posrange 必须大于 0，minl 不能小于 0")
    if args.mino < 0 or args.maxo < args.mino or args.gaps < 0 or args.moongaps < 0:
        raise ValueError("行星轨道范围或 gaps 无效")
    if args.minc < 0 or args.maxc < args.minc:
        raise ValueError("minc/maxc 无效")
    if args.maxc > 1 and args.gaps * (args.maxc - 1) > args.maxo - args.mino:
        raise ValueError("行星数量上限和 gaps 超出可用轨道范围")
    if args.minr < 0 or args.maxr < args.minr:
        raise ValueError("行星半径范围无效")
    if not star_types or not planet_types:
        raise ValueError("starType.json 和 planetType.json 至少需要一个类型")
    for label, obj in (("starType", star_types), ("planetType", planet_types)):
        for key, value in obj.items():
            if not isinstance(value, dict) or not isinstance(value.get("displayName"), str):
                raise ValueError(f"{label} 条目 {key!r} 缺少 displayName")


def make_positions(count: int, extent: float, min_distance: float) -> list[dict[str, float]]:
    points: list[tuple[float, float]] = []
    for _ in range(count):
        for _attempt in range(100_000):
            point = (random.uniform(-extent, extent), random.uniform(-extent, extent))
            if all(math.dist(point, existing) >= min_distance for existing in points):
                points.append(point)
                break
        else:
            raise ValueError("给定 posrange/minl 无法放置所需数量的恒星系；请扩大范围或减小最小间距")
    return [{"x": round(x, 4), "y": round(y, 4)} for x, y in points]


def sample_orbits(args: argparse.Namespace, count: int) -> list[float]:
    if count == 0:
        return []
    if count == 1:
        return [round(draw_number(args.ro, args.mino, args.maxo, args.roe, args.ros), 5)]
    available = args.maxo - args.mino
    if args.gaps * (count - 1) > available:
        raise ValueError("当前行星数要求的最小轨道间距超出 mino/maxo 范围")
    for _ in range(500):
        values = sorted(draw_number(args.ro, args.mino, args.maxo, args.roe, args.ros) for _ in range(count))
        if all(b - a >= args.gaps for a, b in zip(values, values[1:])):
            return [round(value, 5) for value in values]
    # Deterministic safe fallback when a narrow normal distribution makes rejection unlikely.
    step = available / (count - 1)
    if step < args.gaps:
        raise ValueError("轨道范围不足以满足 gaps")
    return [round(args.mino + i * step, 5) for i in range(count)]


def make_body(key: str, name: str, kind: str, orbital_radius: float, args: argparse.Namespace) -> dict[str, Any]:
    # Orbital periods are stored in days; game code can convert to seconds for display.
    period_days = 365.25 * math.sqrt(max(orbital_radius, 0.000001) ** 3)
    return {
        "displayName": name,
        "planetType": kind,
        "position": {
            "orbitalRadius": round(orbital_radius, 5),
            "orbitalPeriod": round(period_days, 5),
            "radius": round(draw_number(args.rr, args.minr, args.maxr, args.rre, args.rrs), 2),
        },
        "surface": {},
        "planet": {},
    }


def generate(args: argparse.Namespace) -> dict[str, Any]:
    stars = load_json(args.star_types)
    planets = load_json(args.planet_types)
    validate(args, stars, planets)
    positions = make_positions(args.count, args.posrange, args.minl)
    star_keys = list(stars)
    planet_keys = list(planets)
    output: dict[str, Any] = {}

    for system_index in range(args.count):
        star_key, star_name = unique_name(STAR_NAMES, system_index, "Star")
        if star_key in output:
            star_key = f"Star{system_index + 1:03d}"
        star_type = random.choice(star_keys)
        planet_count = draw_count(args.rc, args.minc, args.maxc, args.rce, args.rcs)
        orbits = sample_orbits(args, planet_count)
        system_planets: dict[str, Any] = {}
        for planet_index, orbit in enumerate(orbits):
            planet_key, planet_name = unique_name(PLANET_NAMES, planet_index, "World")
            planet_key = f"{planet_key}{planet_index + 1:02d}"
            planet_type = random.choice(planet_keys)
            body = make_body(planet_key, planet_name, planet_type, orbit, args)

            left_gap = orbit - orbits[planet_index - 1] if planet_index else math.inf
            right_gap = orbits[planet_index + 1] - orbit if planet_index + 1 < planet_count else math.inf
            nearest_gap = min(left_gap, right_gap)
            # Bound moons to half the distance to the nearest neighboring planet's orbit.
            # Then require sibling moons to respect their own minimum orbital spacing.
            moon_max = min(10.0, nearest_gap / 2) if math.isfinite(nearest_gap) else 1.0
            moon_max = max(0.0, moon_max)
            requested_moons = random.randint(0, 2) if moon_max > 0.0001 else 0
            moon_capacity = 0 if moon_max <= 0.0001 else 1 + int((moon_max - 0.0001) // args.moongaps) if args.moongaps > 0 else requested_moons
            moon_count = min(requested_moons, moon_capacity)
            moons: dict[str, Any] = {}
            moon_orbits: list[float] = []
            if moon_count == 1:
                moon_orbits = [random.uniform(0.0001, moon_max)]
            elif moon_count > 1:
                for _ in range(500):
                    candidate = sorted(random.uniform(0.0001, moon_max) for _ in range(moon_count))
                    if all(b - a >= args.moongaps for a, b in zip(candidate, candidate[1:])):
                        moon_orbits = candidate
                        break
                if not moon_orbits:
                    span = moon_max - 0.0001
                    step = span / (moon_count - 1)
                    moon_orbits = [0.0001 + i * step for i in range(moon_count)]
            for moon_index in range(moon_count):
                moon_key, moon_name = unique_name(MOON_NAMES, moon_index, "Moon")
                moon_key = f"{moon_key}{moon_index + 1:02d}"
                moon_orbit = moon_orbits[moon_index]
                moon = make_body(moon_key, moon_name, random.choice(planet_keys), moon_orbit, args)
                # A compact game-scale lunar orbit usually completes in several days.
                moon["position"]["orbitalPeriod"] = round(random.uniform(1, 60), 5)
                moons[moon_key] = moon
            body["planet"] = moons
            system_planets[planet_key] = body

        output[star_key] = {
            "displayName": star_name,
            "starType": star_type,
            "position": positions[system_index],
            "surface": {},
            "planet": system_planets,
        }
    return output


def main() -> int:
    args = parse_args()
    try:
        result = generate(args)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as exc:
        print(f"错误：{exc}", file=sys.stderr)
        return 2
    planets = sum(len(system["planet"]) for system in result.values())
    moons = sum(len(body["planet"]) for system in result.values() for body in system["planet"].values())
    print(f"已生成 {args.output}：{len(result)} 个恒星系、{planets} 颗行星、{moons} 颗卫星")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
