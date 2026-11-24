#!/usr/bin/env python3
"""Read-only R3 adapter for the pinned GPL webnovel-writer knowledge corpus."""
import argparse
import json
from pathlib import Path
import re
import sys
import unicodedata

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "references/webnovel"
UPSTREAM = BASE / "upstream"
sys.path.insert(0, str(UPSTREAM / "scripts"))
import genre_taxonomy as taxonomy
import reference_search as bm25

TABLES = ("题材与调性推理", "桥段套路", "金手指与设定", "爽点与节奏", "人设与关系", "场景写法", "写作技法", "命名规则", "裁决规则")
SKILLS = ("init", "plan", "write", "review", "query", "learn")
POLICY = "知识仅供参考；作者已确认的选择、R3协议与事实优先。不强制配额、评分或上游审稿裁决。"
CSV_DIR = UPSTREAM / "references/csv"
SUPPLEMENT = BASE / "supplement/csv"

def source_path(base, table):
    return (base / (table + ".csv")).relative_to(ROOT).as_posix()

def read_manifest():
    return json.loads((BASE / "UPSTREAM-MANIFEST.json").read_text(encoding="utf-8"))

def rel(path):
    return (UPSTREAM / path).relative_to(ROOT).as_posix()

def norm(value):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value).strip().lower())

def unique(seq):
    return list(dict.fromkeys(seq))

def topic_catalog():
    return json.loads((BASE / "supplement/topics.json").read_text(encoding="utf-8"))["topics"]

def topic(identifier):
    for item in topic_catalog():
        if item["id"] == identifier:
            return {"status": "ok", **item, "paths": [(BASE / p).relative_to(ROOT).as_posix() for p in item["paths"]], "policy": POLICY}
    return {"status": "not_found", "id": identifier, "policy": POLICY}

def route(genres):
    tax = taxonomy.load_genre_taxonomy()
    entries, unresolved = [], []
    for raw in genres:
        tokens = [raw] if norm(raw) in tax.lookup else taxonomy.split_genre_input(raw)
        for token in tokens:
            e = tax.lookup.get(norm(token))
            if e is None:
                unresolved.append(token)
            elif e not in entries:
                entries.append(e)
    worlds = [x for x in entries if x.label_type not in {"trope", "format"}]
    canonical = unique(x.canonical_genre for x in (worlds or entries))
    warnings = []
    if entries and not worlds:
        warnings.append("仅匹配玩法/形式；归属题材是检索提示，不代表作者已确定世界题材。")
    if unresolved:
        warnings.append("保留未解析标签，不静默映射；可作流派关键词并明确选择题材。")
    if len(canonical) > 1:
        warnings.append("保留所有题材轴，不套用固定比例；主线与融合机制由作者确认。")
    return {"canonicalGenres": canonical,
            "matchedLabels": [{"label": x.label, "type": x.label_type, "canonical": x.canonical_genre} for x in entries],
            "unresolved": unique(unresolved),
            "templates": unique(rel("templates/genres/" + x.template_file) for x in entries if x.template_file),
            "withoutDedicatedTemplate": unique(x.label for x in entries if not x.template_file),
            "routeTags": unique(t for x in entries for t in x.route_tags),
            "tropeTags": unique(t for x in entries for t in x.trope_tags),
            "formatTags": unique(t for x in entries for t in x.format_tags),
            "profile": rel("references/genre-profiles.md"), "warnings": warnings}

def search(genres, skill, query, table=None, limit=5):
    if not query.strip():
        raise ValueError("QUERY_REQUIRED")
    if not 1 <= limit <= 20:
        raise ValueError("LIMIT_1_TO_20")
    if table is not None and table not in TABLES:
        raise ValueError("UNKNOWN_TABLE")
    if skill not in SKILLS:
        raise ValueError("UNKNOWN_SKILL")
    if genres == ["全部"]:
        resolved = {"canonicalGenres": [], "warnings": ["显式全题材搜索，结果仍按需选用。"], "unresolved": []}
        filters = [None]
    else:
        resolved = route(genres)
        filters = resolved["canonicalGenres"]
        if not filters:
            return {"status": "unresolved_genre", "route": resolved, "results": [], "policy": POLICY}
    per_genre = []
    for g in filters:
        collections = []
        for base in (CSV_DIR, SUPPLEMENT):
            if not base.is_dir():
                continue
            result = bm25.search(base, skill, query, table=table, genre=g, max_results=limit)
            if result.get("status") != "success":
                raise ValueError("KNOWLEDGE_SEARCH_FAILED")
            collections.append([(base, row) for row in result["data"]["results"]])
        # Keep source and independently authored supplements distinguishable.
        # Interleave per-source ranks rather than comparing separately fitted scores.
        merged = []
        for rank in range(limit):
            for results in collections:
                if rank < len(results):
                    merged.append(results[rank])
        per_genre.append((g, merged[:limit]))
    chosen = {}
    for rank in range(limit):
        for g, rows in per_genre:
            if rank >= len(rows):
                continue
            base, row = rows[rank]
            key = (row["表"], row["编号"])
            if key in chosen:
                if g not in chosen[key]["matchedFor"]:
                    chosen[key]["matchedFor"].append(g)
                continue
            if len(chosen) >= limit:
                continue
            chosen[key] = {"id": row["编号"], "table": row["表"], "category": row["分类"],
                           "genres": row["适用题材"], "summary": row["内容摘要"],
                           "source": source_path(base, row["表"]),
                           "origin": "upstream" if base == CSV_DIR else "r3-supplement",
                           "matchedFor": [g], "advisoryOnly": True}
    return {"status": "ok", "route": resolved, "query": query, "skill": skill,
            "perGenreHits": [{"genre": g, "returnedCandidates": len(rows)} for g, rows in per_genre],
            "results": list(chosen.values()), "policy": POLICY}

def entry(identifier):
    for base in (CSV_DIR, SUPPLEMENT):
        for name in TABLES:
            for row in bm25.load_tables(base, table=name).get(name, []):
                if row["编号"] == identifier:
                    return {"status": "ok", "id": identifier, "table": name,
                            "source": source_path(base, name), "origin": "upstream" if base == CSV_DIR else "r3-supplement",
                            "reference": row, "advisoryOnly": True, "policy": POLICY}
    return {"status": "not_found", "id": identifier, "policy": POLICY}

def catalog():
    manifest = read_manifest()
    tax = taxonomy.load_genre_taxonomy()
    return {"status": "ok", "source": manifest["source"],
            "tables": [{"name": x["table"], "rows": len(x["ids"])} for x in manifest["tables"]],
            "supplementTables": [{"name": name, "rows": len(rows)} for name, rows in bm25.load_tables(SUPPLEMENT).items()],
            "genres": [{"label": x.label, "canonical": x.canonical_genre, "type": x.label_type,
                        "template": x.template_file, "aliases": x.aliases} for x in tax.entries],
            "topics": [{"id": t["id"], "name": t["name"], "stages": t["stages"]} for t in topic_catalog()],
            "manifest": "references/webnovel/UPSTREAM-MANIFEST.json", "policy": POLICY}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    for action in ("route", "search"):
        p = sub.add_parser(action)
        p.add_argument("--genre", required=True, action="append", help="可重复指定或用+组合；全部仅用于显式全库检索")
        if action == "search":
            p.add_argument("--skill", required=True, choices=SKILLS)
            p.add_argument("--query", required=True)
            p.add_argument("--table", choices=TABLES)
            p.add_argument("--limit", type=int, default=5)
    sub.add_parser("catalog")
    sub.add_parser("topic").add_argument("id")
    sub.add_parser("entry").add_argument("id")
    args = parser.parse_args()
    try:
        if args.action == "route":
            result = {"status": "ok", **route(args.genre), "policy": POLICY}
            if not result["canonicalGenres"]:
                result["status"] = "unresolved_genre"
        elif args.action == "search":
            result = search(args.genre, args.skill, args.query, args.table, args.limit)
        elif args.action == "entry":
            result = entry(args.id)
        elif args.action == "topic":
            result = topic(args.id)
        else:
            result = catalog()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["status"] == "ok" else 1
    except (OSError, ValueError, KeyError) as e:
        print(json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
