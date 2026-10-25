import json
from pathlib import Path
from pypdf import PdfReader

root = Path('data/srd/5.2.1')
pdf = root / 'raw' / 'SRD_CC_v5.2.1.pdf'
reader = PdfReader(str(pdf))
pages = [{'page': i, 'text': (page.extract_text() or '').strip()} for i, page in enumerate(reader.pages, 1)]
(root / 'raw' / 'pages.json').write_text(json.dumps({'source': pdf.name, 'pageCount': len(pages), 'pages': pages}, ensure_ascii=False, indent=2), encoding='utf-8')
metadata = {
    'version': '5.2.1',
    'status': 'raw-extracted',
    'source': pdf.name,
    'pages': len(pages),
    'license': 'CC-BY-4.0',
    'attribution': 'This work includes material from the System Reference Document 5.2.1 (SRD 5.2.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'
}
(root / 'metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Extracted {len(pages)} pages; {sum(bool(p["text"]) for p in pages)} pages contain text.')
