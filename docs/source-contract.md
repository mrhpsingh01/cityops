# NYC 311 source contract and initial audit

**Source:** [311 Service Requests from 2020 to Present](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9), dataset ID `erm2-nwe9`. The schema and counts below were queried on October 10, 2026. NYC's display labels Problem and Problem Detail correspond to API fields `complaint_type` and `descriptor`.

## Verified source fields

The current dataset metadata reports `unique_key`, `agency`, `agency_name`, `complaint_type`, `descriptor`, `status`, `borough`, `community_board`, `incident_zip`, `resolution_description`, and `council_district` as text. It reports `created_date` and `closed_date` as calendar dates, and `latitude`/`longitude` as numbers. The importer selects only these supported fields. It preserves the source payload in `raw_requests` and does not return free-text resolution details or coordinates in public CSV.

Source `unique_key` remains text. Floating `created_date`/`closed_date` values are stored as NYC-local `timestamp without time zone`, preserving civil clock text rather than parsing them as UTC. Coordinate validity is checked against broad NYC bounds, then invalid values are stored as null with a quality flag. Null borough or agency remains null on request rows and becomes `UNKNOWN` only in aggregate keys.

## First release scope and rationale

The initial range is January 1 through February 1, 2025 (exclusive). The three categories were chosen after source profiling because they have substantial volume and nearly complete closure and geography fields, while spanning different operational questions. They do not represent all 311 activity.

| Problem | Source count | With closed date | With latitude | With community board |
| --- | ---: | ---: | ---: | ---: |
| Noise - Residential | 70,837 | 70,837 | 70,835 | 70,837 |
| HEAT/HOT WATER | 67,229 | 67,211 | 67,224 | 67,229 |
| Illegal Parking | 43,139 | 43,139 | 42,971 | 43,139 |
| **Total** | **181,205** | **181,187** | **181,030** | **181,205** |

The imported slice reconciled to 181,205 source rows. It had 175 rows with missing or invalid coordinates, 33 with an unmapped `Unspecified` status, and no quarantined rows in the first successful full run. These values may change after later source corrections. There were 64 requests without a valid recorded closure within seven days, making this slice weak for seven-day risk ranking.

## Reconciliation and refresh

The importer queries source `count(*)` separately for each local date and selected categories, then checks it against staged unique IDs before publishing. It stages all pages and publishes the entire run in one transaction. Re-running a bounded date range upserts by source ID. To detect late closure changes, schedule a recent rolling window and periodically rerun older open or broader slices; a creation-date-only incremental fetch is insufficient. The first deployment has no live schedule configured, so the interface reports the last actual successful run rather than claiming live freshness.

The source API is `https://data.cityofnewyork.us/resource/erm2-nwe9.json`; an optional app token is sent only from the ingestion job via `X-App-Token`. The importer retries 429 and server errors with backoff. The source's historical rows can still be revised; every published finding records the date it was checked.
