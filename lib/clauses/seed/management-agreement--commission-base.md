---
slug: management-agreement--commission-base
title: Commission Base — Gross vs Net
clause_type: consideration
applies_to_archetypes:
  - management-agreement
required_fields:
  - { name: manager_legal_name, type: string }
  - { name: artist_legal_name, type: string }
  - { name: commission_pct, type: number }
  - { name: commission_basis, type: enum }
  - { name: pre_deduction_items, type: list }
provenance_url: https://www.copyright.gov/circs/circ56a.pdf
provenance_note: Adapted from general personal-management conventions described in publicly available music-business educational materials and Volunteer Lawyers for the Arts public guides (paraphrased)
lawyer_reviewed: false
---

{{artist_legal_name}} ("Artist") shall pay {{manager_legal_name}} ("Manager") a commission of {{commission_pct}}% of {{commission_basis}} earned by Artist during the Term from the entertainment activities covered by this Agreement.

If the elected basis is "GROSS", commission is calculated on Artist's gross income before deductions other than the items expressly listed below. If the elected basis is "NET" or "ADJUSTED GROSS", commission is calculated on Artist's income after the deductions listed below.

The following items shall be deducted before commission is calculated, regardless of the elected basis: {{pre_deduction_items}}. Common pre-deduction items include touring production costs, opening-act fees, travel and lodging tied to a specific engagement, agent commissions, recording costs that have not yet been recouped, and applicable taxes withheld at source.

Manager is not entitled to commission on (a) money received but later refunded or charged back, (b) recording funds and tour-support advances that are spent on costs rather than retained by Artist, or (c) any income stream expressly carved out elsewhere in this Agreement.
