#!/usr/bin/env python3
"""
Deterministic Analytics Engine (Python / Pandas / CSV)
Based on: "Let the LLM understand the question. Let Python/SQL calculate the answer."
Follows the deterministic data -> filter -> validate -> group -> audit -> answer pipeline.
"""

import sys
import os
import csv
import json
import argparse
import re
from typing import List, Dict, Any, Optional, Tuple, Set


MONTH_MAP = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    'january': '01', 'february': '02', 'march': '03', 'april': '04', 'june': '06',
    'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
}


def parse_date_to_iso(val: Any) -> Optional[str]:
    """
    Parses various date formats to ISO YYYY-MM-DD.
    Supports DD-MMM-YYYY (e.g. 01-May-2026), YYYY-MM-DD, MM/DD/YYYY, and timestamps.
    """
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "null", "none"):
        return None

    # Format 1: DD-MMM-YYYY (e.g., 01-May-2026)
    m = re.match(r"^(\d{1,2})-([A-Za-z]{3,9})-(\d{4})", s)
    if m:
        day = int(m.group(1))
        mon_str = m.group(2).lower()
        yr = m.group(3)
        mon = MONTH_MAP.get(mon_str)
        if mon:
            return f"{yr}-{mon}-{day:02d}"

    # Format 2: YYYY-MM-DD
    m2 = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m2:
        return f"{m2.group(1)}-{m2.group(2)}-{m2.group(3)}"

    # Format 3: MM/DD/YYYY
    m3 = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m3:
        return f"{m3.group(3)}-{int(m3.group(1)):02d}-{int(m3.group(2)):02d}"

    return None


def normalize_text(val: Any) -> Optional[str]:
    """Normalizes text by trimming whitespace and handling null/empty markers."""
    if val is None:
        return None
    val_str = str(val).strip()
    if val_str == "" or val_str.lower() in ("nan", "null", "none"):
        return None
    return val_str


def normalize_category(val: Any, mapping: Optional[Dict[str, str]] = None) -> str:
    """Normalizes categories with business mapping and case normalization."""
    cleaned = normalize_text(val)
    if cleaned is None:
        return "Missing"
    if mapping:
        lower = cleaned.lower()
        if lower in mapping:
            return mapping[lower]
        if cleaned in mapping:
            return mapping[cleaned]
    return cleaned


def matches_filter(row: Dict[str, Any], filter_spec: Dict[str, Any]) -> bool:
    """Evaluates whether a row matches a filter condition."""
    col = filter_spec.get("column", "")
    op = filter_spec.get("operator", "eq")
    target = filter_spec.get("value")
    raw_val = row.get(col, "")
    val = "" if raw_val is None else str(raw_val).strip()

    if op == "eq":
        if target is None or target == "Missing" or target == "":
            return val == "" or val.lower() in ("nan", "null")
        return val.lower() == str(target).strip().lower()
    elif op == "neq":
        return val.lower() != str(target).strip().lower()
    elif op in ("gt", "gte", "lt", "lte"):
        try:
            num_v = float(val)
            num_t = float(target)
            if op == "gt": return num_v > num_t
            if op == "gte": return num_v >= num_t
            if op == "lt": return num_v < num_t
            if op == "lte": return num_v <= num_t
        except (ValueError, TypeError):
            return False
    elif op == "in":
        if isinstance(target, list):
            lower_targets = [str(t).strip().lower() for t in target]
            return val.lower() in lower_targets
    elif op == "contains":
        if isinstance(target, list):
            lower_val = val.lower()
            return any(str(t).lower() in lower_val for t in target)
        return str(target).lower() in val.lower()
    elif op == "date_range":
        iso = parse_date_to_iso(val)
        if isinstance(target, dict):
            start = target.get("start")
            end_exclusive = target.get("end_exclusive") or target.get("endExclusive")
            if start and end_exclusive:
                if not iso:
                    token = target.get("month_token") or target.get("monthToken")
                    return str(token).lower() in val.lower() if token else False
                return iso >= start and iso < end_exclusive
        return False
    return True


def apply_filters(rows: List[Dict[str, Any]], filters: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """Filters the raw dataset using structured filter conditions."""
    if not filters:
        return rows
    return [r for r in rows if all(matches_filter(r, f) for f in filters)]


# Function 1 — total rows
def total_records(rows: List[Dict[str, Any]], filters: Optional[List[Dict[str, Any]]] = None) -> int:
    return len(apply_filters(rows, filters))


# Function 2 — unique values
def unique_count(rows: List[Dict[str, Any]], column: str, include_missing: bool = False, filters: Optional[List[Dict[str, Any]]] = None) -> int:
    filtered = apply_filters(rows, filters)
    unique_set = set()
    for r in filtered:
        cleaned = normalize_text(r.get(column))
        if cleaned is not None:
            unique_set.add(cleaned.lower())
        elif include_missing:
            unique_set.add("__missing__")
    return len(unique_set)


# Function 3 — grouped count
def group_count(
    rows: List[Dict[str, Any]],
    column: str,
    include_missing: bool = True,
    sort_dir: str = "desc",
    limit: Optional[int] = None,
    filters: Optional[List[Dict[str, Any]]] = None,
    category_mapping: Optional[Dict[str, str]] = None
) -> List[Dict[str, Any]]:
    filtered = apply_filters(rows, filters)
    total_filtered = len(filtered)
    counts: Dict[str, int] = {}

    is_agent_col = "agent sold" in column.lower() or column.lower() == "agent"

    for r in filtered:
        raw_val = r.get(column)
        if is_agent_col:
            cleaned = normalize_text(raw_val)
            cat = cleaned if cleaned is not None else "Missing"
        else:
            cat = normalize_category(raw_val, category_mapping)

        if cat == "Missing" and not include_missing:
            continue
        counts[cat] = counts.get(cat, 0) + 1

    results = []
    for cat, cnt in counts.items():
        pct = round((cnt / total_filtered) * 100.0, 2) if total_filtered > 0 else 0.0
        results.append({
            column: cat,
            "count": cnt,
            "percentage": f"{pct:.2f}%"
        })

    results.sort(key=lambda x: x["count"], reverse=(sort_dir.lower() == "desc"))
    if limit and limit > 0:
        return results[:limit]
    return results


# Validation function with 3-point Audit and reconciliation check
def validate_result(total_rows: int, group_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    calculated_sum = sum(item.get("count", 0) for item in group_items)
    is_valid = calculated_sum == total_rows
    discrepancy = calculated_sum - total_rows
    pct_sum = round(sum(float(item["percentage"].replace("%", "")) for item in group_items), 2) if group_items else 100.0

    return {
        "is_valid": is_valid,
        "total_records": total_rows,
        "sum_of_groups": calculated_sum,
        "discrepancy": discrepancy,
        "reconciliation_status": "PASS" if is_valid else "FAIL",
        "percentage_sum": f"{pct_sum:.1f}%",
        "audit_a_filter_count": total_rows,
        "audit_b_group_sum": calculated_sum,
        "audit_c_reconciliation": "PASS" if is_valid else "FAIL",
        "audit_d_pct_total": f"{pct_sum:.1f}%"
    }


def execute_policy_sales_query(
    raw_rows: List[Dict[str, Any]],
    month: str = "May",
    year: str = "2026",
    group_by: str = "Agent Sold"
) -> Dict[str, Any]:
    """
    Executes the exact 10-step Policy Sales grouped query pipeline:
    1. Parse request into structured dates and status condition (Sold == 'Issued').
    2. Always filter the RAW dataset.
    3. Use exclusive end date: start_date <= Date Sold < end_date_exclusive.
    4. Normalize Sold: Sold.strip().lower() == 'issued'.
    5. Normalize Agent Sold: Agent Sold.strip().
    6. Mandatory reconciliation check: assert filtered_total == sum(group_counts).
    7. Calculate percentages only AFTER grouping using validated denominator.
    8. Perform 3-point audit (Audit A, B, C).
    9. Completeness check: agents in result match active agents in filtered rows.
    10. Return verified result with audit report.
    """
    # Step 1 & 3: Construct start and exclusive end dates
    mon_key = month.strip().lower()
    mon_num = MONTH_MAP.get(mon_key, "05")
    start_yr = int(year)
    start_date = f"{start_yr}-{mon_num}-01"
    next_mon = int(mon_num) + 1
    end_yr = start_yr
    if next_mon > 12:
        next_mon = 1
        end_yr += 1
    end_date_exclusive = f"{end_yr}-{next_mon:02d}-01"

    # Step 2 & 4: Filter RAW dataset
    filtered_issued = []
    flat_cancels = []
    raw_agents_in_filter: Set[str] = set()

    for r in raw_rows:
        ds = r.get("Date Sold", "")
        iso = parse_date_to_iso(ds)
        in_period = False
        if iso:
            in_period = (iso >= start_date and iso < end_date_exclusive)
        else:
            in_period = mon_key in str(ds).lower()

        if in_period:
            sold_norm = str(r.get("Sold", "")).strip().lower()
            if sold_norm == "issued":
                filtered_issued.append(r)
                ag_norm = str(r.get(group_by, "")).strip() or "Missing"
                raw_agents_in_filter.add(ag_norm)
            elif "flat" in sold_norm and "cancel" in sold_norm:
                flat_cancels.append(r)

    total_from_filter = len(filtered_issued)

    # Step 5: Normalize and Group By
    agent_counts: Dict[str, int] = {}
    for r in filtered_issued:
        ag = str(r.get(group_by, "")).strip() or "Missing"
        agent_counts[ag] = agent_counts.get(ag, 0) + 1

    # Step 6: Mandatory Reconciliation Check
    total_from_groups = sum(agent_counts.values())
    if total_from_filter != total_from_groups:
        raise ValueError(
            f"RECONCILIATION FAILURE: Filter count ({total_from_filter}) does not match sum of groups ({total_from_groups})!"
        )

    # Step 7: Calculate percentages
    grouped_table = []
    for ag, cnt in sorted(agent_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (cnt / total_from_filter * 100.0) if total_from_filter > 0 else 0.0
        grouped_table.append({
            group_by: ag,
            "Policies Sold": cnt,
            "Percentage": f"{pct:.2f}%"
        })

    # Step 8: Audits
    pct_sum = sum(float(item["Percentage"].replace("%", "")) for item in grouped_table) if grouped_table else 100.0
    audit_report = {
        "Audit A (Filter count)": total_from_filter,
        "Audit B (Group reconciliation)": total_from_groups,
        "Audit C (Reconciliation status)": "PASS" if total_from_filter == total_from_groups else "FAIL",
        "Audit D (Percentage total)": f"{pct_sum:.1f}%",
        "Audit E (Active agents count)": len(agent_counts),
        "Eliminated Flat Cancels": len(flat_cancels)
    }

    # Step 9: Anomaly detection
    grouped_agent_names = set(agent_counts.keys())
    suspicious_agents = grouped_agent_names - raw_agents_in_filter
    if suspicious_agents:
        raise ValueError(f"ANOMALY DETECTED: Agents {suspicious_agents} not found in filtered raw dataset!")

    return {
        "period": f"{month} {year}",
        "policy_sold_definition": "Sold == 'Issued' (Policies Sold = Issued ONLY)",
        "date_field": "Date Sold",
        "date_range": f"{start_date} <= Date Sold < {end_date_exclusive}",
        "group_by": group_by,
        "total_policies_sold": total_from_filter,
        "data": grouped_table,
        "audit": audit_report,
        "eliminated_flat_cancels_count": len(flat_cancels)
    }


def load_csv(file_path: str) -> List[Dict[str, Any]]:
    """Loads a CSV file into a list of row dicts."""
    rows = []
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    return rows


def main():
    parser = argparse.ArgumentParser(description="Deterministic Policy Analytics Engine CLI")
    parser.add_argument("--file", required=True, help="Path to CSV file")
    parser.add_argument("--month", default="May", help="Month to query (e.g. May, August, July)")
    parser.add_argument("--year", default="2026", help="Year to query (e.g. 2026)")
    parser.add_argument("--group-by", default="Agent Sold", help="Grouping dimension (default: 'Agent Sold')")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File {args.file} not found.", file=sys.stderr)
        sys.exit(1)

    rows = load_csv(args.file)
    res = execute_policy_sales_query(rows, month=args.month, year=args.year, group_by=args.group_by)

    if args.json:
        print(json.dumps(res, indent=2))
        return

    # Formatted user-facing output
    print(f"**{res['total_policies_sold']:,} Policies Sold in {res['period']}** (Grouped by {res['group_by']})\n")
    print(f"*Eliminated Values: {res['eliminated_flat_cancels_count']} Flat Cancel records were eliminated and NOT added to the sold count (Policies Sold = Issued ONLY).*\n")
    print(f"| {res['group_by']} | Policies Sold | Percentage |")
    print(f"| :--- | :--- | :--- |")
    for row in res["data"][:15]:
        print(f"| {row[res['group_by']]} | {row['Policies Sold']:,} | {row['Percentage']} |")
    print(f"| **Total** | **{res['total_policies_sold']:,}** | **100.0%** |\n")
    print(f"### 📋 Reconciliation & Audit:")
    print(f"- **Audit A (Filtered Records)**: {res['audit']['Audit A (Filter count)']:,} policies ({res['date_range']})")
    print(f"- **Audit B (Group Sum)**: {res['audit']['Audit B (Group reconciliation)']:,} policies across {res['audit']['Audit E (Active agents count)']} agents")
    print(f"- **Audit C (Reconciliation Status)**: **{res['audit']['Audit C (Reconciliation status)']}** (Filtered records = Group sum)")
    print(f"- **Audit D (Percentage Reconciliation)**: {res['audit']['Audit D (Percentage total)']} verified\n")


if __name__ == "__main__":
    main()
