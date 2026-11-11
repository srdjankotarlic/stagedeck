"""Create the two complete download folders, without bundling development data."""
import argparse
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "package.json").read_text())["version"]
parser = argparse.ArgumentParser()
parser.add_argument("--windows", type=Path)
parser.add_argument("--windows-plugin", type=Path)
parser.add_argument("--mac", type=Path)
parser.add_argument("--destination", type=Path, required=True)
args = parser.parse_args()
if not (args.windows or args.mac):
    parser.error("specify --windows or --mac")
if args.windows and not args.windows_plugin:
    parser.error("--windows-plugin is required with --windows")
args.destination.mkdir(parents=True, exist_ok=True)


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


packages = [("Windows", args.windows, "StageDeck-Setup.exe", args.windows_plugin)] if args.windows else []
if args.mac:
    packages.append(("Mac", args.mac, "StageDeck.dmg", root / "release/mac-universal/StageDeck.app/Contents/Resources/installers"))
for system, installer, name, plugins in packages:
    folder = args.destination / ("StageDeck-" + system)
    folder.mkdir(exist_ok=True)
    shutil.copy2(installer, folder / name)
    elgato = folder / "Elgato"
    elgato.mkdir(exist_ok=True)
    for file in ("com.stagedeck.presentations.streamDeckPlugin", "StageDeck XL.streamDeckProfile"):
        shutil.copy2(plugins / file, elgato / file)
    shutil.copy2(root / "INSTALL.md", folder / "Start Here.md")
    shutil.copy2(root / "INSTALL-SR.md", folder / "INSTALL-SR.md")
    shutil.copy2(root / "docs/VERIFICATION.md", folder / "Verification.md")
    if system == "Windows":
        shutil.copy2(root / "scripts/install-windows-bundle.cmd", folder / "Install-StageDeck.cmd")
        shutil.copy2(root / "scripts/install-windows-bundle.ps1", folder / "Instaliraj-StageDeck.ps1")
    files = sorted(p for p in folder.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt")
    (folder / "SHA256SUMS.txt").write_text("".join(sha(p) + "  " + p.relative_to(folder).as_posix() + "\n" for p in files))
    target = args.destination / ("StageDeck-" + system + ".zip")
    with zipfile.ZipFile(target, "w", allowZip64=True) as archive:
        for file in sorted(p for p in folder.rglob("*") if p.is_file()):
            archive.write(file, file.relative_to(args.destination).as_posix(), compress_type=zipfile.ZIP_STORED if file.suffix in (".dmg", ".exe") else zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        entries = set(archive.namelist())
        required = [name, "Start Here.md", "Elgato/com.stagedeck.presentations.streamDeckPlugin",
                    "Elgato/StageDeck XL.streamDeckProfile"]
        if system == "Windows":
            required += ["Install-StageDeck.cmd", "Instaliraj-StageDeck.ps1"]
        assert all(f"{folder.name}/{entry}" in entries for entry in required)
    print(f"Verified complete {system} download: {target}")

(args.destination / "SHA256SUMS.txt").write_text("".join(sha(p) + "  " + p.name + "\n" for p in sorted(args.destination.glob("StageDeck-*.zip"))))
