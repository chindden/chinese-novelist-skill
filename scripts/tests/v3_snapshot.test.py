import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
SCRIPT = Path(__file__).resolve().parents[1] / "v3_snapshot.py"
spec = importlib.util.spec_from_file_location("v3_snapshot", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)/"novel"
        self.root.mkdir()
        (self.root/"02-写作计划.json").write_text('{"chapters":[]}',encoding="utf-8")
        (self.root/"第01章.md").write_text("中文小说。\n",encoding="utf-8")
        self.arc = Path(self.temp.name)/"backup.zip"

    def test_roundtrip(self):
        result=module.create(self.root,self.arc)
        self.assertEqual(result["fileCount"],2)
        meta,files=module.verify(self.arc)
        self.assertEqual(len(files),2)
        out=Path(self.temp.name)/"restored"
        module.restore(self.arc,out)
        self.assertEqual((out/"第01章.md").read_bytes(),(self.root/"第01章.md").read_bytes())

    def test_immutable_and_no_overwrite(self):
        module.create(self.root,self.arc)
        with self.assertRaisesRegex(ValueError,"already exists"):
            module.create(self.root,self.arc)
        with self.assertRaisesRegex(ValueError,"must be empty"):
            module.restore(self.arc,self.root)

    def test_reject_corruption(self):
        module.create(self.root,self.arc)
        tampered=Path(self.temp.name)/"bad.zip"
        with zipfile.ZipFile(self.arc) as a,zipfile.ZipFile(tampered,"w") as b:
            for n in a.namelist():
                b.writestr(n,b"damaged" if n=="第01章.md" else a.read(n))
        with self.assertRaisesRegex(ValueError,"SHA-256 mismatch"):
            module.verify(tampered)

    def test_reject_traversal(self):
        with zipfile.ZipFile(self.arc,"w") as z:
            z.writestr("../escape","evil")
            z.writestr(module.MANIFEST,json.dumps({"schemaVersion":1,"files":{}}))
        with self.assertRaisesRegex(ValueError,"Unsafe ZIP path"):
            module.verify(self.arc)

if __name__=="__main__":
    unittest.main()
