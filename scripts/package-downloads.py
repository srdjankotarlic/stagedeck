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
parser.add_argument("--windows", type=Path, required=True)
parser.add_argument("--windows-plugin", type=Path, required=True)
parser.add_argument("--mac", type=Path)
parser.add_argument("--destination", type=Path, required=True)
args = parser.parse_args()
args.destination.mkdir(parents=True, exist_ok=True)


def sha(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


packages = [("Windows", args.windows, "StageDeck-Setup.exe", args.windows_plugin)]
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
    shutil.copy2(root / "INSTALL-SR.md", folder / "Uputstvo.txt")
    shutil.copy2(root / "docs/VERIFICATION.md", folder / "Provere.md")
    text = f"""StageDeck {version} — {system}

1. Pokreni {name} i instaliraj aplikaciju.
   Mac: prevuci StageDeck u Applications. Windows: prati instalaciju.
2. Pokreni StageDeck sa ikonice na desktopu / iz Applications ili Start menija.
3. Ako koristis Stream Deck: instaliraj zvanicnu Elgato aplikaciju.
   U StageDeck Podesavanjima izaberi Instaliraj dodatak, zatim uvezi XL profil.
   Isti dodatak i profil su u folderu Elgato u ovom paketu.
4. Ubaci prezentacije, podesi Ekrane, klikni sliku i pritisni GO.
   Stream Deck taster jednim pritiskom pokrece, drugim potpuno zatvara prikaz.

PowerPoint fajlovi zahtevaju instaliran Microsoft PowerPoint. PDF radi bez njega.
Windows PowerPoint / Presenter View jos zahteva proveru na pravom Office racunaru.
Detalji podrzanih sistema, pocetnih Mac dozvola i provera su u Uputstvo.txt i Provere.md.

Preuzimanja: https://github.com/srdjankotarlic/stagedeck/releases/latest
"""
    (folder / "POCNI OVDE.txt").write_text(text, encoding="utf-8")
    files = sorted(p for p in folder.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt")
    (folder / "SHA256SUMS.txt").write_text("".join(sha(p) + "  " + p.relative_to(folder).as_posix() + "\n" for p in files))
    target = args.destination / ("StageDeck-" + system + ".zip")
    with zipfile.ZipFile(target, "w", allowZip64=True) as archive:
        for file in sorted(p for p in folder.rglob("*") if p.is_file()):
            archive.write(file, file.relative_to(args.destination).as_posix(), compress_type=zipfile.ZIP_STORED if file.suffix in (".dmg", ".exe") else zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert any(p.endswith("/" + name) for p in archive.namelist())
    print(f"Verified complete {system} download: {target}")

(args.destination / "SHA256SUMS.txt").write_text("".join(sha(p) + "  " + p.name + "\n" for p in sorted(args.destination.glob("StageDeck-*.zip"))))
