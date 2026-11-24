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
        self.assertIn("快穿", k.route(["攻略系统"])["withoutDedicatedTemplate"])
        self.assertEqual(k.route(["全球高武"])["canonicalGenres"], ["都市"])
        self.assertEqual(k.route(["仙侠+种田+系统流"])["canonicalGenres"], ["仙侠", "种田"])
        self.assertEqual(k.route(["未知虚构题材"])["unresolved"], ["未知虚构题材"])

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
