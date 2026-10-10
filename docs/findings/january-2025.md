# January 2025 source-count findings

Checked against NYC Open Data dataset `erm2-nwe9` on **October 10, 2026**. The creation windows below each cover 14 full NYC-local calendar days. Counts are distinct request rows identified by `unique_key` in the supported category slice. Later source corrections can change live dashboard values.

## 1. Residential noise discontinuity

| Problem | Jan 4–17 | Jan 18–31 | Change |
| --- | ---: | ---: | ---: |
| Noise - Residential | 44,150 | 14,158 | −67.9% |
| HEAT/HOT WATER | 32,312 | 30,624 | −5.2% |
| Illegal Parking | 20,193 | 18,695 | −7.4% |
| **Three-category total** | **96,655** | **63,477** | **−34.3%** |

`(14,158 − 44,150) / 44,150 = −0.6793`. Daily Noise - Residential counts were 3,795 on January 13, 717 on January 14, and generally near 700–1,100 later, except a January 24 spike. The other two supported problems changed much less across the same equal-length windows. A category-specific discontinuity deserves a source/process check before anyone interprets it as a change in residents' underlying experiences.

Source check:

```text
$select=complaint_type,count(*) as n
$where=created_date >= '2025-01-04T00:00:00'
  AND created_date < '2025-01-18T00:00:00'
  AND complaint_type IN('Noise - Residential','HEAT/HOT WATER','Illegal Parking')
$group=complaint_type
```

Repeat with `2025-01-18T00:00:00` and `2025-02-01T00:00:00` for the second window. Daily check: `$select=date_trunc_ymd(created_date) as day,count(*) as n`, `$group=day`, filtered to Noise - Residential. The API uses the same inclusive start, exclusive end semantics.

**Alternative explanations:** reporting-channel changes, source classification, intake processing, holidays/weather, and actual behavior. The available source counts alone do not distinguish them. Compare descriptors, channels, and agency data, then look for a published NYC source note before making an operational recommendation.

[Open the filtered CityOps trend](http://localhost:3000/dashboard?from=2025-01-18&toExclusive=2025-02-01&problem=Noise%20-%20Residential).

## 2. Bronx share of heat reports

For HEAT/HOT WATER on January 18–31, the Bronx had 11,422 of 30,624 reports, or **37.3%**. In the preceding 14 days it had 12,294 of 32,312, or **38.0%**. The share changed by about −0.75 percentage points while the category total fell 5.2%.

Source check:

```text
$select=borough,count(*) as n
$where=created_date >= '2025-01-18T00:00:00'
  AND created_date < '2025-02-01T00:00:00'
  AND complaint_type = 'HEAT/HOT WATER'
$group=borough
```

Repeat for January 4–17. A high raw share is a prompt to inspect context, not proof of a higher per-resident rate or a staffing shortfall. A population or housing denominator, reporting behavior, and closure cohorts would be needed before recommending resource changes.

[Open the filtered borough view](http://localhost:3000/map?from=2025-01-18&toExclusive=2025-02-01&problem=HEAT%2FHOT+WATER).
