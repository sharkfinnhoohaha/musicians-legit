---
slug: performance-gig--deposit-and-payment
title: Deposit and Payment Timing
clause_type: consideration
applies_to_archetypes:
  - performance-gig
required_fields:
  - { name: artist_legal_name, type: string }
  - { name: purchaser_legal_name, type: string }
  - { name: total_fee, type: number }
  - { name: deposit_pct, type: number }
  - { name: deposit_due_date, type: date }
  - { name: balance_payment_timing, type: enum }
provenance_url: https://www.copyright.gov/circs/circ56a.pdf
provenance_note: Adapted from general live-performance contract conventions described in publicly available music-business educational materials and Volunteer Lawyers for the Arts public guides (paraphrased)
lawyer_reviewed: false
---

The total guaranteed fee for the engagement (the "Fee") is ${{total_fee}}, payable by {{purchaser_legal_name}} ("Purchaser") to {{artist_legal_name}} ("Artist") as follows.

A non-refundable deposit equal to {{deposit_pct}}% of the Fee is due no later than {{deposit_due_date}}. The deposit confirms the engagement; if the deposit is not received by the due date, Artist may treat the engagement as cancelled by Purchaser and is entitled to retain any partial payment received as liquidated damages.

The remaining balance is due {{balance_payment_timing}} (for example, "in cash or certified funds before Artist takes the stage," "by wire transfer no later than 24 hours before doors open," or "by ACH within 7 days after the performance").

If the balance is not paid when due, Artist is not obligated to perform and is entitled to retain the deposit. Any payment dispute does not give Purchaser the right to withhold payment for a performance that has been delivered.
