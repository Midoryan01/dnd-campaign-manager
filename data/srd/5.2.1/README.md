# SRD 5.2.1 local source

`raw/SRD_CC_v5.2.1.pdf` is the expected official 364-page source file, but the PDF is not included in this repository. `raw/pages.json` contains extracted page text. Regenerate it with `npm run srd:extract` after placing the PDF at the expected path and installing `requirements.txt`.

`normalized/srd_equipment.json` contains normalized monsters, spells, equipment, magic items, feats, and rules glossary data used by `npm run db:seed:srd`. The seeder synchronizes these typed records and searchable rules to the database. `raw/pages.json` can be checked with `npm run srd:validate`.

Attribution: This work includes material from the System Reference Document 5.2.1 (SRD 5.2.1) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under CC-BY-4.0.
