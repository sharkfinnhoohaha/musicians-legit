---
slug: distribution-agreement--term-and-exclusivity
title: Distribution Term, Exclusivity, and Takedown
clause_type: term
applies_to_archetypes:
  - distribution-agreement
required_fields:
  - { name: artist_legal_name, type: string }
  - { name: distributor_legal_name, type: string }
  - { name: term_years, type: number }
  - { name: exclusivity_election, type: enum }
  - { name: takedown_notice_days, type: number }
provenance_url: https://www.copyright.gov/circs/circ56a.pdf
provenance_note: Adapted from US Copyright Office Circular 56A and general digital-distribution conventions described in publicly available music-business educational materials (paraphrased)
lawyer_reviewed: false
---

Term. {{distributor_legal_name}} ("Distributor") shall distribute the recordings delivered by {{artist_legal_name}} ("Artist") for {{term_years}} years from the effective date of this Agreement. Either party may decline to renew by giving sixty (60) days' notice prior to the end of the Term.

Exclusivity. Election: {{exclusivity_election}}. If "EXCLUSIVE", Artist may not engage another distributor for the recordings covered by this Agreement during the Term. If "NON-EXCLUSIVE", Artist may engage other distributors for any platform not actually being serviced by Distributor. In either case, Distributor's exclusivity ends with the Term.

Takedown. Artist may instruct Distributor in writing to take down any recording from any or all platforms. Distributor shall initiate the takedown within {{takedown_notice_days}} days of receiving the request and shall use reasonable efforts to confirm completion across all platforms. Distributor may continue to collect and account for revenues earned before takedown.

After the Term ends, Distributor shall remove all of Artist's recordings from all platforms within sixty (60) days unless the parties agree in writing to a tail period for collection of pre-existing earnings. Distributor's right to use Artist's recordings, name, or likeness for promotional purposes ends with the Term.
