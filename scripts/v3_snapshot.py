#!/usr/bin/env python3
"""Immutable ZIP project snapshots with byte-level SHA-256 verification.

python3 scripts/v3_snapshot.py create PROJECT OUTPUT.zip
python3 scripts/v3_snapshot.py verify OUTPUT.zip
python3 scripts/v3_snapshot.py restore OUTPUT.zip EMPTY_DIRECTORY

The host handles Drive upload/download and verifies remote round-trip SHA-256.
This script does not claim to connect to Drive itself.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import sys
import zipfile

MANIFEST = "V3-SNAPSHOT-MANIFEST.json"
EXCLUDED = {".git", "__pycache__", ".venv", "node_modules"}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def safe(name):
    p = PurePosixPath(name)
    return bool(name and not name.startswith("/") and "\\" not in name
                and ".." not in p.parts and p.as_posix() == name)

def verify(archive):
    with zipfile.ZipFile(archive, "r") as z:
        names = z.namelist()
        if len(names) != len(set(names)) or names.count(MANIFEST) != 1:
            raise ValueError("ZIP entries duplicated or missing manifest")
        if not all(safe(x) for x in names):
            raise ValueError("Unsafe ZIP path")
        meta = json.loads(z.read(MANIFEST))
        if meta.get("schemaVersion") != 1 or not isinstance(meta.get("files"), dict):
            raise ValueError("Invalid manifest schema")
        expected = meta["files"]
        if MANIFEST in expected or set(expected) != set(names)-{MANIFEST}:
            raise ValueError("Manifest/file list mismatch")
        contents = {}
        for name, properties in expected.items():
            if not safe(name) or not isinstance(properties, dict):
                raise ValueError("Unsafe manifest entry")
            data = z.read(name)
            if sha(data) != properties.get("sha256") or len(data) != properties.get("size"):
                raise ValueError("SHA-256 mismatch: " + name)
            contents[name] = data
    return meta, contents

def create(project, output):
    root = Path(project).resolve()
    target = Path(output).resolve()
    if not root.is_dir() or not (root/"02-写作计划.json").is_file():
        raise ValueError("Missing project or writing plan")
    if target.exists():
        raise ValueError("Immutable snapshot already exists; choose a new version name")
    target.parent.mkdir(parents=True, exist_ok=True)
    files = {}
    for entry in sorted(root.rglob("*")):
        if not entry.is_file() or any(part in EXCLUDED for part in entry.relative_to(root).parts):
            continue
        if entry.is_symlink():
            raise ValueError("Symlink not allowed: " + str(entry))
        if entry.resolve() == target:
            continue
        name = entry.relative_to(root).as_posix()
        if name == MANIFEST:
            raise ValueError("Reserved manifest filename")
        if not safe(name):
            raise ValueError("Unsafe path")
        data = entry.read_bytes()
        files[name] = {"sha256":sha(data),"size":len(data)}
    if not files:
        raise ValueError("Empty project")
    manifest = {"schemaVersion":1,"projectName":root.name,"files":files}
    tmp = target.with_suffix(target.suffix + ".tmp")
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for name in files:
                z.write(root/name, name)
            z.writestr(MANIFEST, json.dumps(manifest, ensure_ascii=False, sort_keys=True).encode("utf-8"))
        verify(tmp)
        os.replace(tmp, target)
    finally:
        if tmp.exists():
            tmp.unlink()
    return {"archive":str(target),"sha256":sha(target.read_bytes()),"fileCount":len(files)}

def restore(archive, directory):
    meta, data = verify(archive)
    dest = Path(directory).resolve()
    if dest.exists() and (not dest.is_dir() or any(dest.iterdir())):
        raise ValueError("Restore directory must be empty")
    dest.mkdir(parents=True,exist_ok=True)
    for name, contents in data.items():
        file = dest/name
        file.parent.mkdir(parents=True,exist_ok=True)
        file.write_bytes(contents)
    return {"directory":str(dest),"projectName":meta["projectName"],"fileCount":len(data)}

def main():
    args = sys.argv[1:]
    if len(args)==3 and args[0]=="create":
        result = create(args[1], args[2])
    elif len(args)==2 and args[0]=="verify":
        meta, contents = verify(args[1])
        result = {"verified":True,"projectName":meta["projectName"],"fileCount":len(contents),"archiveSha256":sha(Path(args[1]).read_bytes())}
    elif len(args)==3 and args[0]=="restore":
        result = restore(args[1], args[2])
    else:
        raise ValueError("Usage: v3_snapshot.py create PROJECT ZIP | verify ZIP | restore ZIP DIR")
    print(json.dumps({"ok":True,**result},ensure_ascii=False))

if __name__=="__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok":False,"error":str(exc)},ensure_ascii=False),file=sys.stderr)
        sys.exit(1)
