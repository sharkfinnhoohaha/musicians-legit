---
slug: boilerplate--governing-law-delaware
title: Governing Law and Dispute Resolution
clause_type: boilerplate
applies_to_archetypes:
  - split-sheet
  - producer-beat-agreement
  - work-for-hire-vs-royalty
  - recoupment-advance
  - 360-deal
  - management-agreement
  - sync-licensing
  - sample-clearance
  - band-partnership
  - performance-gig
  - publishing-admin-vs-copub
  - distribution-agreement
  - master-ownership
  - nda-collab
required_fields:
  - { name: governing_state, type: string }
  - { name: dispute_venue, type: string }
  - { name: arbitration_election, type: enum }
provenance_url: https://www.uscourts.gov/about-federal-courts/types-cases
provenance_note: Adapted from general contract-drafting conventions. Default governing law is the State of Delaware as a commonly chosen neutral US contract jurisdiction; users may override.
lawyer_reviewed: false
---

This Agreement is governed by and construed in accordance with the laws of the {{governing_state}} (default: the State of Delaware), without regard to its conflict-of-laws principles.

Any dispute arising out of or relating to this Agreement shall be resolved as follows. First, the parties shall attempt in good faith to resolve the dispute through direct discussion for at least thirty (30) days after written notice. If the dispute is not resolved through discussion, the parties shall then attempt non-binding mediation with a mutually agreed mediator for at least thirty (30) days.

Election: {{arbitration_election}}.

- If "ARBITRATION", any unresolved dispute shall be finally settled by confidential binding arbitration administered by a recognized arbitration body in {{dispute_venue}}, before a single arbitrator. Judgment on the award may be entered in any court of competent jurisdiction.
- If "COURT", any unresolved dispute shall be brought exclusively in the state or federal courts located in {{dispute_venue}}, and each party consents to the personal jurisdiction of those courts.

Each party shall bear its own costs and attorneys' fees, except that the prevailing party may recover reasonable attorneys' fees if the dispute resolution body or court determines such recovery is appropriate.
