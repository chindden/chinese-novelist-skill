import json
import csv
import hashlib
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("knowledge", ROOT / "scripts/webnovel_knowledge.py")
k = importlib.util.module_from_spec(spec)
spec.loader.exec_module(k)

class KnowledgeTests(unittest.TestCase):
    def test_imported_bytes_and_inventory(self):
        manifest = k.read_manifest()
        self.assertEqual(len(manifest["files"]), 118)
        expected = set()
        for f in manifest["files"]:
            p = k.UPSTREAM / f["path"]
            data = p.read_bytes()
            self.assertEqual(len(data), f["bytes"], f["path"])
            self.assertEqual(hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest(), f["gitBlob"], f["path"])
            expected.add(f["path"])
        actual = {p.relative_to(k.UPSTREAM).as_posix() for p in k.UPSTREAM.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
        self.assertEqual(actual, expected)

    def test_all_rows_exact_source_ids_and_canonicals(self):
        manifest = k.read_manifest()
        self.assertEqual(sum(len(x["ids"]) for x in manifest["tables"]), 739)
        all_ids = set()
        for t in manifest["tables"]:
            with (k.UPSTREAM / t["path"]).open(encoding="utf-8-sig", newline="") as f:
                rows = list(csv.DictReader(f))
            self.assertEqual([x["编号"] for x in rows], t["ids"])
            self.assertFalse(any(None in row or any(v is None for v in row.values()) for row in rows))
            self.assertEqual(len(set(t["ids"])), len(t["ids"]))
            self.assertFalse(all_ids.intersection(t["ids"]))
            all_ids.update(t["ids"])
            genres = {g for row in rows for g in (row.get("适用题材") or row.get("题材") or "").split("|")}
            self.assertTrue(set(manifest["canonicalGenres"]).issubset(genres), t["table"])
        self.assertEqual(len(all_ids), 739)
        for t in manifest["tables"]:
            r = k.entry(t["ids"][0])
            self.assertEqual(r["id"], t["ids"][0])
            self.assertTrue(r["advisoryOnly"])
        self.assertEqual(k.entry("NOT-A-KNOWN-ID")["status"], "not_found")

    def test_taxonomy_templates_and_aliases(self):
        tax = k.taxonomy.load_genre_taxonomy()
        self.assertEqual(len(tax.entries), 56)
        self.assertEqual(len({x.canonical_genre for x in tax.entries}), 15)
        templates = {x.template_file for x in tax.entries if x.template_file}
        self.assertEqual(templates, {p.name for p in (k.UPSTREAM / "templates/genres").glob("*.md")})
        self.assertEqual(len(templates), 37)
        for e in tax.entries:
            self.assertIn(e.label, [x["label"] for x in k.route([e.label])["matchedLabels"]])
        self.assertIn("快穿", k.route(["攻略系统"])["upstreamWithoutDedicatedTemplate"])
        self.assertNotIn("快穿", k.route(["攻略系统"])["withoutDedicatedTemplate"])
        self.assertTrue(any(p.endswith("quick-transmigration.md") for p in k.route(["攻略系统"])["templates"]))
        self.assertEqual(k.route(["全球高武"])["canonicalGenres"], ["都市"])
        self.assertEqual(k.route(["仙侠+种田+系统流"])["canonicalGenres"], ["仙侠", "种田"])
        self.assertEqual(k.route(["未知虚构题材"])["unresolved"], ["未知虚构题材"])

    def test_all_craft_references_have_topic_access(self):
        audit = json.loads((k.BASE / "supplement/ASSET-ROUTING-AUDIT.json").read_text(encoding="utf-8"))
        manifest = k.read_manifest()
        self.assertEqual({f["path"] for f in audit["files"]}, {f["path"] for f in manifest["files"]})
        self.assertEqual(len(audit["files"]), 118)
        by_topic = {t["id"]: t for t in k.topic_catalog()}
        self.assertEqual(len(by_topic), 12)
        for f in audit["files"]:
            if f["usage"] == "optional-craft-reference":
                self.assertTrue(f["topics"], f["path"])
            for t in f["topics"]:
                self.assertIn("upstream/" + f["path"], by_topic[t]["paths"])
        for name in by_topic:
            t = k.topic(name)
            self.assertTrue(t["guard"])
            self.assertTrue(all((ROOT / p).is_file() for p in t["paths"]))
        self.assertTrue(any(p.endswith("foreshadowing.md") for p in k.topic("foreshadowing")["paths"]))
        self.assertTrue(any(p.endswith("设定集-反派设计.md") for p in k.topic("character")["paths"]))
        self.assertEqual(k.topic("unknown-topic")["status"], "not_found")

    def test_specialist_templates_and_flow_combinations(self):
        tax = k.taxonomy.load_genre_taxonomy()
        gaps = [e.label for e in tax.entries if not e.template_file and (e.label_type != "canonical" or e.label == "快穿")]
        self.assertEqual(len(gaps), 11)
        for label in gaps:
            r = k.route([label])
            self.assertNotIn(label, r["withoutDedicatedTemplate"])
            self.assertTrue(r["templates"], label)
            self.assertTrue(all((ROOT / p).is_file() for p in r["templates"]))
        self.assertEqual(len(k.supplement_routes()), 23)
        for row in k.supplement_routes():
            r = k.route([row["label"]])
            self.assertFalse(r["unresolved"], row["label"])
            p = (k.BASE / row["path"]).relative_to(ROOT).as_posix()
            self.assertIn(p, r["templates"] + [x["path"] for x in r["flowReferences"]])
            self.assertIn("## 叙事引擎", (ROOT / p).read_text(encoding="utf-8"))
        r = k.route(["仙侠+凡人流+苟道+长生+家族流"])
        self.assertEqual(r["canonicalGenres"], ["仙侠"])
        self.assertEqual({x["label"] for x in r["flowReferences"]}, {"凡人流","苟道流","长生流","家族经营"})
        self.assertFalse(r["unresolved"])
        self.assertEqual(k.route(["科幻+穿越流"])["canonicalGenres"], ["科幻"])
        self.assertEqual(k.route(["都市+学院流"])["canonicalGenres"], ["都市"])
        self.assertEqual(k.route(["科幻+宗门流"])["canonicalGenres"], ["科幻"])
        self.assertEqual(k.route(["仙侠+宗门流"])["canonicalGenres"], ["仙侠"])
        self.assertTrue(k.route(["宗门流"])["hintOnly"])
        self.assertIn("宗门经营", {x["label"] for x in k.route(["科幻+宗门流"])["flowReferences"]})
        self.assertEqual(k.route(["幕后布局"])["canonicalGenres"], [])
        self.assertTrue(k.route(["幕后布局"])["hintOnly"])
        self.assertEqual(k.route(["同人"])["canonicalGenres"], ["衍生"])

    def test_cross_genre_bounded_advisory_search(self):
        r = k.search(["仙侠", "种田"], "init", "角色命名", "命名规则", 6)
        self.assertEqual(r["status"], "ok")
        self.assertEqual(r["route"]["canonicalGenres"], ["仙侠", "种田"])
        self.assertLessEqual(len(r["results"]), 6)
        self.assertTrue(r["results"])
        self.assertTrue(all(x["returnedCandidates"] > 0 for x in r["perGenreHits"]))
        self.assertIn("R3-NR-002", {x["id"] for x in r["results"]})
        self.assertEqual(k.entry("R3-NR-002")["origin"], "r3-supplement")
        self.assertEqual(len({x["id"] for x in r["results"]}), len(r["results"]))
        for x in r["results"]:
            self.assertTrue(x["advisoryOnly"])
            self.assertNotIn("大模型指令", x)
            self.assertTrue((ROOT / x["source"]).is_file())
            self.assertEqual(k.entry(x["id"])["table"], x["table"])
        self.assertEqual(k.search(["未知虚构题材"], "write", "对话")["status"], "unresolved_genre")
        self.assertEqual(k.search(["全部"], "write", "对话", "写作技法", 2)["status"], "ok")
        with self.assertRaises(ValueError):
            k.search(["仙侠"], "write", "对话", limit=100)

    def test_representative_queries(self):
        cases = [
            ("全球高武", "write", "战斗描写", "场景写法"),
            ("规则怪谈", "write", "规则", "桥段套路"),
            ("宫斗", "init", "角色命名", "命名规则"),
            ("电竞", "write", "对话", "写作技法"),
            ("校园甜文", "write", "情感描写", "写作技法"),
            ("年代文", "init", "命名", "命名规则"),
            ("快穿", "plan", "任务", "桥段套路"),
            ("同人", "plan", "人物", "人设与关系"),
        ]
        for genre, stage, query, table in cases:
            with self.subTest(genre=genre):
                r = k.search([genre], stage, query, table, 5)
                self.assertEqual(r["status"], "ok")
                self.assertTrue(r["results"], genre)
                self.assertTrue(all(x["table"] == table for x in r["results"]))
                if genre == "宫斗":
                    self.assertIn("R3-NR-001", {x["id"] for x in r["results"]})

if __name__ == "__main__":
    unittest.main()
