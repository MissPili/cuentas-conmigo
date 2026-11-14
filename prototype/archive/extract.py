import sys
import pypdf

r = pypdf.PdfReader(sys.argv[1])
with open(sys.argv[2], "w", encoding="utf-8") as out:
    out.write(f"{len(r.pages)} pages\n")
    for i, p in enumerate(r.pages):
        out.write(f"--- p{i+1} ---\n")
        out.write((p.extract_text() or "") + "\n")
