-- Set VAT to 16% on LPO-0032.
--
-- The document's VAT is derived from a per-line `taxRate` inside the `items`
-- JSONB array (see normalizeLines() in src/lib/docs.ts), so it is not enough to
-- write the `vat` column: every line's taxRate has to say 16 too, otherwise the
-- next amend would recompute VAT back to zero and the printed "Taxes" column
-- would contradict the totals block.
--
-- So this does both, exactly as the app would:
--   taxRate := 16 on every line   ·   vat := subtotal × 16%   ·   total := subtotal + vat
--
-- Idempotent — re-running it produces the same figures.
-- Apply: paste into the Supabase SQL editor. The trailing SELECT is the
-- verification, so it is the result you will see.

BEGIN;

UPDATE "Lpo" AS l
SET
  items = COALESCE((
    SELECT jsonb_agg(jsonb_set(elem, '{taxRate}', '16'::jsonb) ORDER BY ord)
    FROM jsonb_array_elements(l.items) WITH ORDINALITY AS t(elem, ord)
  ), l.items),
  vat = ROUND((l.subtotal * 0.16)::numeric, 2),
  total = l.subtotal + ROUND((l.subtotal * 0.16)::numeric, 2),
  "updatedAt" = NOW()
WHERE l.number = 'LPO-0032';

COMMIT;

-- Verify: vat should be 16% of subtotal, total = subtotal + vat, and every line
-- should report taxRate 16.
SELECT
  number,
  subtotal,
  vat,
  total,
  jsonb_agg(jsonb_build_object('description', line->>'description', 'taxRate', line->'taxRate')) AS line_tax_rates
FROM "Lpo", LATERAL jsonb_array_elements(items) AS line
WHERE number = 'LPO-0032'
GROUP BY number, subtotal, vat, total;
