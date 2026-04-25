---
slug: producer-beat-agreement--lease-vs-exclusive
title: Lease vs Exclusive License Election
clause_type: grant
applies_to_archetypes:
  - producer-beat-agreement
required_fields:
  - { name: producer_legal_name, type: string }
  - { name: artist_legal_name, type: string }
  - { name: beat_title, type: string }
  - { name: license_type, type: enum }
  - { name: lease_unit_cap, type: number }
provenance_url: https://www.copyright.gov/circs/circ56a.pdf
provenance_note: Adapted from US Copyright Office Circular 56A and general beat-licensing conventions documented in publicly available music-industry educational materials (paraphrased)
lawyer_reviewed: false
---

{{producer_legal_name}} ("Producer") grants {{artist_legal_name}} ("Artist") rights in the instrumental beat titled "{{beat_title}}" (the "Beat") under one of the following two license types. The Artist must elect one option, and the elected option will govern this Agreement.

Option A — Non-Exclusive Lease. Producer retains ownership of the Beat and may license the Beat to other artists. Artist may use the Beat to create one (1) derivative recording and may distribute that recording up to a cap of {{lease_unit_cap}} paid units (streams, downloads, or physical copies combined). If Artist exceeds the cap, Artist must upgrade to Option B or negotiate a new license.

Option B — Exclusive License. Producer agrees not to license the Beat to any new third party after the effective date of this Agreement. Producer retains underlying authorship of the Beat but transfers exclusive use rights in the Beat to Artist for the term and territory specified elsewhere in this Agreement. Pre-existing non-exclusive leases issued before the effective date remain valid.

Elected option: {{license_type}}.
