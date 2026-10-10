"""Features permitted at creation time for the seven-day outcome experiment."""

ALLOWED_FEATURES = (
    "problem",
    "problem_detail",
    "borough",
    "community_board",
    "created_weekday",
    "created_hour",
    "created_month",
)
FORBIDDEN_FIELDS = {
    "closed_at_local",
    "status_raw",
    "status_normalized",
    "resolution_description",
    "ingested_at",
    "close_hours",
    "quality_flags",
    "target",
}


def assert_feature_contract(columns):
    columns = set(columns)
    leaked = columns & FORBIDDEN_FIELDS
    if leaked:
        raise ValueError(f"Post-creation feature leakage: {sorted(leaked)}")
    unexpected = columns - set(ALLOWED_FEATURES)
    if unexpected:
        raise ValueError(f"Unapproved model features: {sorted(unexpected)}")
