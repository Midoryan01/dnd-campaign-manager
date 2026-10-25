import json
from pathlib import Path


path = Path("data/srd/5.2.1/raw/pages.json")
data = json.loads(path.read_text(encoding="utf-8"))
pages = data.get("pages") if isinstance(data, dict) else None

if not isinstance(pages, list):
    raise SystemExit("Expected raw/pages.json to contain a pages array.")
if data.get("pageCount") != len(pages):
    raise SystemExit("pageCount does not match the number of page records.")
if any(
    not isinstance(page, dict)
    or not isinstance(page.get("page"), int)
    or not isinstance(page.get("text"), str)
    for page in pages
):
    raise SystemExit("Every page must have an integer page number and text string.")

text_pages = sum(bool(page["text"].strip()) for page in pages)
print(f"Pages: {len(pages)}; pages with extracted text: {text_pages}")
