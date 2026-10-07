import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TrainingCatalogRow {
  approach_type: string;
  intent: string;
  question_type: string;
  operation: string;
  columns_used: string;
  date_basis: string;
  filter_logic: string;
  calculation_rules: string;
  validation_or_output_rule: string;
}

export const CATALOG_ROWS: TrainingCatalogRow[] = [
  // Core metrics
  {
    approach_type: "METRIC",
    intent: "Policies sold",
    question_type: "Policies sold / issued",
    operation: "COUNT",
    columns_used: "Sold",
    date_basis: "Date Sold",
    filter_logic: "normalized(Sold)=='issued'",
    calculation_rules: "Count rows; never use unique POLICY#; exclude Flat Cancel",
    validation_or_output_rule: "Primary sold metric"
  },
  {
    approach_type: "METRIC",
    intent: "Quotes",
    question_type: "Quotes",
    operation: "COUNT",
    columns_used: "Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Quoted Date is not null",
    calculation_rules: "Includes quotes that later became Issued",
    validation_or_output_rule: "Quote count"
  },
  {
    approach_type: "METRIC",
    intent: "Quoted-not-sold",
    question_type: "Quoted-not-sold",
    operation: "COUNT",
    columns_used: "Sold",
    date_basis: "Quoted Date",
    filter_logic: "normalized(Sold)=='quoted'",
    calculation_rules: "Use Sold status exactly",
    validation_or_output_rule: "Quoted but not issued"
  },
  {
    approach_type: "METRIC",
    intent: "Flat cancels",
    question_type: "Flat cancels",
    operation: "COUNT",
    columns_used: "Sold",
    date_basis: "Date Sold",
    filter_logic: "normalized(Sold)=='flat cancel'",
    calculation_rules: "Never include in Policies Sold",
    validation_or_output_rule: "Report separately"
  },
  {
    approach_type: "METRIC",
    intent: "Leads",
    question_type: "Total leads",
    operation: "COUNT",
    columns_used: "All columns",
    date_basis: "Added Time",
    filter_logic: "none",
    calculation_rules: "COUNT all source rows",
    validation_or_output_rule: "Date basis is Added Time"
  },
  {
    approach_type: "METRIC",
    intent: "Premium written",
    question_type: "Premium written",
    operation: "SUM",
    columns_used: "Premium Amt",
    date_basis: "Date Sold",
    filter_logic: "normalized(Sold)=='issued'",
    calculation_rules: "Sum only Issued rows",
    validation_or_output_rule: "Do not infer premium from other statuses"
  },
  {
    approach_type: "METRIC",
    intent: "Average premium",
    question_type: "Average premium",
    operation: "MEAN",
    columns_used: "Premium Amt",
    date_basis: "Date Sold",
    filter_logic: "normalized(Sold)=='issued'",
    calculation_rules: "Mention median if mean is skewed",
    validation_or_output_rule: "Issued only"
  },
  {
    approach_type: "METRIC",
    intent: "Unique policies",
    question_type: "Unique policies",
    operation: "NUNIQUE",
    columns_used: "POLICY#",
    date_basis: "Date Sold",
    filter_logic: "normalized(Sold)=='issued'",
    calculation_rules: "Exclude blank POLICY# from nunique; report blank count if useful",
    validation_or_output_rule: "Different from sold row count"
  },
  {
    approach_type: "METRIC",
    intent: "Close rate",
    question_type: "Close rate",
    operation: "RATIO",
    columns_used: "Sold + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Issued / rows with Quoted Date",
    calculation_rules: "Same period and date basis",
    validation_or_output_rule: "State date basis"
  },
  // Grouping
  {
    approach_type: "GROUPBY",
    intent: "Sold by Lead Type",
    question_type: "Sold status by Lead Type",
    operation: "GROUPBY COUNT",
    columns_used: "Lead Type + Sold",
    date_basis: "Requested date column if any",
    filter_logic: "User filters first",
    calculation_rules: "Normalize categorical values; retain blanks",
    validation_or_output_rule: "Show all <=25; else top20 + Others + full count"
  },
  {
    approach_type: "GROUPBY",
    intent: "Sold by Agent",
    question_type: "Policies sold by Agent Sold",
    operation: "GROUPBY COUNT",
    columns_used: "Agent Sold + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Normalize Agent Sold",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Quoted by Agent",
    question_type: "Quotes by Agent Quoted",
    operation: "GROUPBY COUNT",
    columns_used: "Agent Quoted + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Quoted Date not null",
    calculation_rules: "Normalize Agent Quoted",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Lead Source distribution",
    question_type: "Leads by Lead Source",
    operation: "GROUPBY COUNT",
    columns_used: "Lead Source",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Keep blank bucket",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Partner distribution",
    question_type: "Leads by Partner Name",
    operation: "GROUPBY COUNT",
    columns_used: "Partner Name",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Keep blank bucket",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Carrier distribution",
    question_type: "Issued by Ins Company",
    operation: "GROUPBY COUNT",
    columns_used: "Ins Company + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Keep blanks",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Line of business",
    question_type: "Issued by Line of Biz",
    operation: "GROUPBY COUNT",
    columns_used: "Line of Biz + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Do not merge distinct LOB values",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Lead Type distribution",
    question_type: "Records by Lead Type",
    operation: "GROUPBY COUNT",
    columns_used: "Lead Type",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Normalize case/whitespace; retain blank",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "State distribution",
    question_type: "Leads by State",
    operation: "GROUPBY COUNT",
    columns_used: "State",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Normalize case/whitespace; retain blank",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Garaging State",
    question_type: "Leads by Garaging State",
    operation: "GROUPBY COUNT",
    columns_used: "Garaging State",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Normalize categorical values",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "City distribution",
    question_type: "Leads by City",
    operation: "GROUPBY COUNT",
    columns_used: "City",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Normalize whitespace/case carefully",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Method distribution",
    question_type: "Issued by Method",
    operation: "GROUPBY COUNT",
    columns_used: "Method + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Keep blanks",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "GROUPBY",
    intent: "Customer Type",
    question_type: "Leads by Customer Type",
    operation: "GROUPBY COUNT",
    columns_used: "Customer Type",
    date_basis: "Added Time",
    filter_logic: "User period if specified",
    calculation_rules: "Keep blank bucket",
    validation_or_output_rule: "Descending"
  },
  // Exact filtering
  {
    approach_type: "FILTER",
    intent: "Partner Name filter",
    question_type: "Leads with Partner Name X",
    operation: "COUNT",
    columns_used: "Partner Name",
    date_basis: "Added Time",
    filter_logic: "normalized(Partner Name)==X",
    calculation_rules: "Never substitute Lead Source",
    validation_or_output_rule: "Exact requested column"
  },
  {
    approach_type: "FILTER",
    intent: "Lead Source filter",
    question_type: "Leads with Lead Source X",
    operation: "COUNT",
    columns_used: "Lead Source",
    date_basis: "Added Time",
    filter_logic: "normalized(Lead Source)==X",
    calculation_rules: "Never substitute Partner Name",
    validation_or_output_rule: "Exact requested column"
  },
  {
    approach_type: "FILTER",
    intent: "Agent Sold filter",
    question_type: "Policies sold by Agent X",
    operation: "COUNT",
    columns_used: "Agent Sold + Sold",
    date_basis: "Date Sold",
    filter_logic: "Agent Sold==X AND Sold=='issued'",
    calculation_rules: "Use Date Sold",
    validation_or_output_rule: "Issued only"
  },
  {
    approach_type: "FILTER",
    intent: "Agent Quoted filter",
    question_type: "Quotes by Agent X",
    operation: "COUNT",
    columns_used: "Agent Quoted + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Agent Quoted==X AND Quoted Date not null",
    calculation_rules: "Use Quoted Date",
    validation_or_output_rule: "Quote metric"
  },
  {
    approach_type: "FILTER",
    intent: "Carrier filter",
    question_type: "Policies issued by carrier X",
    operation: "COUNT",
    columns_used: "Ins Company + Sold",
    date_basis: "Date Sold",
    filter_logic: "Ins Company==X AND Sold=='issued'",
    calculation_rules: "Use exact field",
    validation_or_output_rule: "Issued only"
  },
  {
    approach_type: "FILTER",
    intent: "Lead Type filter",
    question_type: "Records with Lead Type X",
    operation: "COUNT",
    columns_used: "Lead Type",
    date_basis: "Added Time",
    filter_logic: "normalized(Lead Type)==X",
    calculation_rules: "Normalize categorical field",
    validation_or_output_rule: "All statuses unless user says sold"
  },
  {
    approach_type: "FILTER",
    intent: "State filter",
    question_type: "Leads in state X",
    operation: "COUNT",
    columns_used: "State",
    date_basis: "Added Time",
    filter_logic: "normalized(State)==X",
    calculation_rules: "Do not use Garaging State unless asked",
    validation_or_output_rule: "All records by default"
  },
  // Time
  {
    approach_type: "TIME",
    intent: "Monthly sold",
    question_type: "Policies sold in month",
    operation: "COUNT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued' AND month/year match",
    calculation_rules: "Resolve year explicitly",
    validation_or_output_rule: "Most recent complete occurrence if year omitted"
  },
  {
    approach_type: "TIME",
    intent: "Monthly quotes",
    question_type: "Quotes in month",
    operation: "COUNT",
    columns_used: "Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Quoted Date within month",
    calculation_rules: "Includes later Issued",
    validation_or_output_rule: "Date basis Quote Date"
  },
  {
    approach_type: "TIME",
    intent: "Monthly leads",
    question_type: "Leads created in month",
    operation: "COUNT",
    columns_used: "Added Time",
    date_basis: "Added Time",
    filter_logic: "Added Time within month",
    calculation_rules: "Parse timestamp format",
    validation_or_output_rule: "Creation basis"
  },
  {
    approach_type: "TIME",
    intent: "Quarterly sold",
    question_type: "Policies sold by quarter",
    operation: "GROUPBY COUNT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Quarter = calendar quarter unless specified",
    validation_or_output_rule: "Chronological"
  },
  {
    approach_type: "TIME",
    intent: "Weekly sold",
    question_type: "Policies sold by week",
    operation: "GROUPBY COUNT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Define week convention",
    validation_or_output_rule: "State convention"
  },
  {
    approach_type: "TIME",
    intent: "Yearly sold",
    question_type: "Policies sold by year",
    operation: "GROUPBY COUNT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Use valid dates only",
    validation_or_output_rule: "Chronological"
  },
  {
    approach_type: "TIME",
    intent: "Month-over-month",
    question_type: "Current vs previous month",
    operation: "COMPARE",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Calculate absolute and % change",
    validation_or_output_rule: "Same metric"
  },
  {
    approach_type: "TIME",
    intent: "Year-over-year",
    question_type: "Same month vs prior year",
    operation: "COMPARE",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Compare same calendar month",
    validation_or_output_rule: "State years"
  },
  {
    approach_type: "TIME",
    intent: "Date range sold",
    question_type: "Policies sold between dates",
    operation: "COUNT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued' AND start<=date<=end",
    calculation_rules: "Use inclusive/exclusive consistently",
    validation_or_output_rule: "State range"
  },
  // Distinct
  {
    approach_type: "DISTINCT",
    intent: "Unique Lead Sources",
    question_type: "Unique Lead Source values",
    operation: "NUNIQUE",
    columns_used: "Lead Source",
    date_basis: "None",
    filter_logic: "Exclude blank by default unless asked",
    calculation_rules: "Normalize values first",
    validation_or_output_rule: "List values if requested"
  },
  {
    approach_type: "DISTINCT",
    intent: "Unique Partner Names",
    question_type: "Unique Partner Name values",
    operation: "NUNIQUE",
    columns_used: "Partner Name",
    date_basis: "None",
    filter_logic: "Exclude blank by default",
    calculation_rules: "Normalize values",
    validation_or_output_rule: "List values if requested"
  },
  {
    approach_type: "DISTINCT",
    intent: "Unique Lead Types",
    question_type: "Unique Lead Type values",
    operation: "NUNIQUE",
    columns_used: "Lead Type",
    date_basis: "None",
    filter_logic: "Exclude blank by default",
    calculation_rules: "Normalize case/whitespace",
    validation_or_output_rule: "AUTO and Auto merge"
  },
  {
    approach_type: "DISTINCT",
    intent: "Unique Agents Sold",
    question_type: "Unique Agent Sold values",
    operation: "NUNIQUE",
    columns_used: "Agent Sold",
    date_basis: "None",
    filter_logic: "Exclude blank by default",
    calculation_rules: "Normalize names",
    validation_or_output_rule: "List if requested"
  },
  {
    approach_type: "DISTINCT",
    intent: "Unique carriers",
    question_type: "Unique Ins Company values",
    operation: "NUNIQUE",
    columns_used: "Ins Company",
    date_basis: "None",
    filter_logic: "Exclude blank by default",
    calculation_rules: "Normalize whitespace/case",
    validation_or_output_rule: "List if requested"
  },
  {
    approach_type: "DISTINCT",
    intent: "Unique policies",
    question_type: "Unique POLICY# among Issued",
    operation: "NUNIQUE",
    columns_used: "POLICY# + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Blank policy numbers are not unique policies",
    validation_or_output_rule: "Report blank count if useful"
  },
  // Ranking
  {
    approach_type: "RANK",
    intent: "Top Agent Sold",
    question_type: "Agent with most policies sold",
    operation: "GROUPBY+MAX",
    columns_used: "Agent Sold + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Exact requested dimension",
    validation_or_output_rule: "No ranking tie-breaking without rule"
  },
  {
    approach_type: "RANK",
    intent: "Top Lead Type",
    question_type: "Lead Type with most records",
    operation: "GROUPBY+MAX",
    columns_used: "Lead Type",
    date_basis: "Added Time",
    filter_logic: "No status filter unless requested",
    calculation_rules: "Include blank if requested/default",
    validation_or_output_rule: "Do not invent Category"
  },
  {
    approach_type: "RANK",
    intent: "Top Lead Source",
    question_type: "Lead Source with most leads",
    operation: "GROUPBY+MAX",
    columns_used: "Lead Source",
    date_basis: "Added Time",
    filter_logic: "No status filter unless requested",
    calculation_rules: "Keep blanks separately",
    validation_or_output_rule: "No column substitution"
  },
  {
    approach_type: "RANK",
    intent: "Top carrier",
    question_type: "Carrier with most issued policies",
    operation: "GROUPBY+MAX",
    columns_used: "Ins Company + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Normalize carrier names",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "RANK",
    intent: "Top partner",
    question_type: "Partner with most leads",
    operation: "GROUPBY+MAX",
    columns_used: "Partner Name",
    date_basis: "Added Time",
    filter_logic: "No status filter unless requested",
    calculation_rules: "Exact Partner Name field",
    validation_or_output_rule: "Never use Lead Source instead"
  },
  {
    approach_type: "RANK",
    intent: "Top city",
    question_type: "City with most leads",
    operation: "GROUPBY+MAX",
    columns_used: "City",
    date_basis: "Added Time",
    filter_logic: "No status filter unless requested",
    calculation_rules: "Normalize whitespace/case",
    validation_or_output_rule: "Descending"
  },
  // Cross tabs
  {
    approach_type: "CROSSTAB",
    intent: "Lead Type x Sold",
    question_type: "Sold status by Lead Type",
    operation: "CROSSTAB COUNT",
    columns_used: "Lead Type + Sold",
    date_basis: "Added Time unless date filter",
    filter_logic: "User period filter first",
    calculation_rules: "Include blank buckets",
    validation_or_output_rule: "Rows reconcile to filtered total"
  },
  {
    approach_type: "CROSSTAB",
    intent: "Agent x Sold",
    question_type: "Sold status by Agent Sold",
    operation: "CROSSTAB COUNT",
    columns_used: "Agent Sold + Sold",
    date_basis: "Added Time unless status/date metric",
    filter_logic: "Normalize names",
    calculation_rules: "Blank Agent bucket retained",
    validation_or_output_rule: "Do not imply sales from Date Sold alone"
  },
  {
    approach_type: "CROSSTAB",
    intent: "Source x Lead Type",
    question_type: "Lead Source by Lead Type",
    operation: "CROSSTAB COUNT",
    columns_used: "Lead Source + Lead Type",
    date_basis: "Added Time",
    filter_logic: "No status filter unless asked",
    calculation_rules: "Retain blanks",
    validation_or_output_rule: "Reconcile total"
  },
  {
    approach_type: "CROSSTAB",
    intent: "Carrier x Lead Type",
    question_type: "Carrier by Lead Type",
    operation: "CROSSTAB COUNT",
    columns_used: "Ins Company + Lead Type",
    date_basis: "Added Time",
    filter_logic: "No status filter unless asked",
    calculation_rules: "Retain blanks",
    validation_or_output_rule: "Reconcile total"
  },
  // Missing/data quality
  {
    approach_type: "QUALITY",
    intent: "Missing values",
    question_type: "Missing count by column",
    operation: "COUNTNULL",
    columns_used: "Any column",
    date_basis: "None",
    filter_logic: "null/blank rules",
    calculation_rules: "Do not call missing zero",
    validation_or_output_rule: "Report count and %"
  },
  {
    approach_type: "QUALITY",
    intent: "Missing Sold",
    question_type: "Leads with blank Sold",
    operation: "COUNTNULL",
    columns_used: "Sold",
    date_basis: "None",
    filter_logic: "Sold blank",
    calculation_rules: "Blank means no activity logged",
    validation_or_output_rule: "Do not call Quoted/Not Sold"
  },
  {
    approach_type: "QUALITY",
    intent: "Missing Policy Number",
    question_type: "Issued rows with blank POLICY#",
    operation: "COUNTNULL",
    columns_used: "POLICY# + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued' AND POLICY# blank",
    calculation_rules: "Report separately",
    validation_or_output_rule: "Does not remove Issued row"
  },
  {
    approach_type: "QUALITY",
    intent: "Invalid dates",
    question_type: "Unparsed dates",
    operation: "COUNT",
    columns_used: "Relevant date column",
    date_basis: "Relevant date",
    filter_logic: "Parse with exact format",
    calculation_rules: "Never silently drop",
    validation_or_output_rule: "Report unparsed count"
  },
  {
    approach_type: "QUALITY",
    intent: "Duplicate policy numbers",
    question_type: "Repeated POLICY#",
    operation: "GROUPBY COUNT",
    columns_used: "POLICY#",
    date_basis: "None",
    filter_logic: "Exclude blank unless asked",
    calculation_rules: "Show duplicate frequency",
    validation_or_output_rule: "Does not change sold count"
  },
  {
    approach_type: "QUALITY",
    intent: "Duplicate Lead IDs",
    question_type: "Duplicate ID values",
    operation: "NUNIQUE/COUNT",
    columns_used: "ID",
    date_basis: "None",
    filter_logic: "ID should be unique",
    calculation_rules: "Report duplicates",
    validation_or_output_rule: "Data quality issue"
  },
  {
    approach_type: "QUALITY",
    intent: "Source row count",
    question_type: "Exact CSV rows",
    operation: "COUNT",
    columns_used: "All rows",
    date_basis: "None",
    filter_logic: "None",
    calculation_rules: "Must equal len(df)",
    validation_or_output_rule: "Baseline for audits"
  },
  // Reconciliation
  {
    approach_type: "AUDIT",
    intent: "Group reconciliation",
    question_type: "Check grouped totals",
    operation: "SUM vs COUNT",
    columns_used: "Requested group column",
    date_basis: "Same as metric",
    filter_logic: "Same filter applied",
    calculation_rules: "SUM group counts must equal filtered rows",
    validation_or_output_rule: "PASS/FAIL"
  },
  {
    approach_type: "AUDIT",
    intent: "Percentage reconciliation",
    question_type: "Check percentages",
    operation: "SUM",
    columns_used: "Grouped metric",
    date_basis: "Same as metric",
    filter_logic: "Same filter",
    calculation_rules: "Percentages should total ~100%",
    validation_or_output_rule: "Allow rounding tolerance"
  },
  {
    approach_type: "AUDIT",
    intent: "Filter audit",
    question_type: "Verify exact field used",
    operation: "SCHEMA CHECK",
    columns_used: "Requested column",
    date_basis: "Metric-specific",
    filter_logic: "Exact field match",
    calculation_rules: "No semantic substitution",
    validation_or_output_rule: "Fail if wrong field"
  },
  {
    approach_type: "AUDIT",
    intent: "Status audit",
    question_type: "Verify sold status",
    operation: "VALUE CHECK",
    columns_used: "Sold",
    date_basis: "Date Sold",
    filter_logic: "Issued only",
    calculation_rules: "Flat Cancel never included",
    validation_or_output_rule: "Fail if any Flat Cancel included"
  },
  {
    approach_type: "AUDIT",
    intent: "Date audit",
    question_type: "Verify date basis",
    operation: "SCHEMA CHECK",
    columns_used: "Metric-specific date",
    date_basis: "Metric-specific",
    filter_logic: "Sold→Date Sold; Quote→Quoted Date; Leads→Added Time",
    calculation_rules: "Never substitute dates",
    validation_or_output_rule: "Fail if wrong date field"
  },
  {
    approach_type: "AUDIT",
    intent: "Source integrity",
    question_type: "Prevent impossible counts",
    operation: "COUNT",
    columns_used: "All rows",
    date_basis: "None",
    filter_logic: "None",
    calculation_rules: "No result may exceed source row count",
    validation_or_output_rule: "Fail if group/filter count > source rows"
  },
  // Compound questions
  {
    approach_type: "COMPOUND",
    intent: "Sold by agent in month",
    question_type: "Agent sales for month",
    operation: "GROUPBY COUNT",
    columns_used: "Agent Sold + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued' AND month filter",
    calculation_rules: "Exact date basis",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "COMPOUND",
    intent: "Quotes by source in month",
    question_type: "Quotes by Lead Source",
    operation: "GROUPBY COUNT",
    columns_used: "Lead Source + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Quoted Date within month",
    calculation_rules: "Normalize source",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "COMPOUND",
    intent: "Issued by carrier and state",
    question_type: "Issued by carrier/state",
    operation: "GROUPBY COUNT",
    columns_used: "Ins Company + State + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Keep blanks",
    validation_or_output_rule: "Descending"
  },
  {
    approach_type: "COMPOUND",
    intent: "Lead Type sold rate",
    question_type: "Issued rate by Lead Type",
    operation: "RATIO GROUPBY",
    columns_used: "Lead Type + Sold + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Issued / quoted rows",
    calculation_rules: "Same period",
    validation_or_output_rule: "State denominator"
  },
  {
    approach_type: "COMPOUND",
    intent: "Agent close rate",
    question_type: "Close rate by Agent Quoted",
    operation: "RATIO GROUPBY",
    columns_used: "Agent Quoted + Sold + Quoted Date",
    date_basis: "Quoted Date",
    filter_logic: "Issued / quoted rows",
    calculation_rules: "Agent Quoted is denominator dimension",
    validation_or_output_rule: "State basis"
  },
  {
    approach_type: "COMPOUND",
    intent: "Partner sales",
    question_type: "Issued by Partner Name",
    operation: "GROUPBY COUNT",
    columns_used: "Partner Name + Sold",
    date_basis: "Date Sold",
    filter_logic: "Sold=='issued'",
    calculation_rules: "Exact Partner Name field",
    validation_or_output_rule: "Never substitute Lead Source"
  },
  // Natural language safeguards
  {
    approach_type: "SAFEGUARD",
    intent: "Ambiguous category",
    question_type: "User says 'category' without field",
    operation: "CLARIFY",
    columns_used: "None",
    date_basis: "None",
    filter_logic: "No Category column",
    calculation_rules: "Do not select a column automatically",
    validation_or_output_rule: "Ask one sharp clarification"
  },
  {
    approach_type: "SAFEGUARD",
    intent: "Ambiguous month",
    question_type: "User says 'August'",
    operation: "RESOLVE DATE",
    columns_used: "Relevant date column",
    date_basis: "Metric-specific",
    filter_logic: "Most recent complete occurrence",
    calculation_rules: "State resolved month/year",
    validation_or_output_rule: "Do not use previous answer"
  },
  {
    approach_type: "SAFEGUARD",
    intent: "Ambiguous policies",
    question_type: "User says 'policies'",
    operation: "USE DEFAULT",
    columns_used: "Sold + Date Sold",
    date_basis: "Date Sold",
    filter_logic: "Default to Issued row count",
    calculation_rules: "Mention unique policies only if explicitly requested",
    validation_or_output_rule: "Do not substitute NUNIQUE"
  },
  {
    approach_type: "SAFEGUARD",
    intent: "Wrong-column prevention",
    question_type: "Partner Name vs Lead Source",
    operation: "EXACT MATCH",
    columns_used: "Named field",
    date_basis: "Metric-specific",
    filter_logic: "Use exact requested column",
    calculation_rules: "No substitution",
    validation_or_output_rule: "Show executed filter"
  },
  {
    approach_type: "SAFEGUARD",
    intent: "No fabricated field",
    question_type: "User asks unknown column",
    operation: "SCHEMA CHECK",
    columns_used: "Requested field",
    date_basis: "None",
    filter_logic: "Column absent",
    calculation_rules: "Do not infer closest field",
    validation_or_output_rule: "Ask/identify unavailable field"
  },
  {
    approach_type: "SAFEGUARD",
    intent: "No historical answer reuse",
    question_type: "Repeated question",
    operation: "RECOMPUTE",
    columns_used: "Current CSV",
    date_basis: "Metric-specific",
    filter_logic: "Always execute fresh calculation",
    calculation_rules: "Never use previous answer as source",
    validation_or_output_rule: "Current file is authoritative"
  },
  // Output
  {
    approach_type: "OUTPUT",
    intent: "Simple count",
    question_type: "Single requested count",
    operation: "COUNT",
    columns_used: "User-specified field",
    date_basis: "Metric-specific",
    filter_logic: "User filter",
    calculation_rules: "Lead with bold number",
    validation_or_output_rule: "Second line is filter"
  },
  {
    approach_type: "OUTPUT",
    intent: "Grouped result <=25",
    question_type: "Full group table",
    operation: "GROUPBY",
    columns_used: "User field",
    date_basis: "Metric-specific",
    filter_logic: "User filters",
    calculation_rules: "Show all groups",
    validation_or_output_rule: "Descending by metric"
  },
  {
    approach_type: "OUTPUT",
    intent: "Grouped result >25",
    question_type: "Top groups",
    operation: "GROUPBY",
    columns_used: "User field",
    date_basis: "Metric-specific",
    filter_logic: "User filters",
    calculation_rules: "Top20 + Others + full group count",
    validation_or_output_rule: "Do not hide total"
  },
  {
    approach_type: "OUTPUT",
    intent: "Comparison",
    question_type: "Two periods",
    operation: "COMPARE",
    columns_used: "Same metric",
    date_basis: "Metric-specific",
    filter_logic: "Two explicit periods",
    calculation_rules: "Show both values and difference",
    validation_or_output_rule: "No unsupported causal claim"
  },
  {
    approach_type: "OUTPUT",
    intent: "Trend",
    question_type: "Monthly/weekly trend",
    operation: "GROUPBY TIME",
    columns_used: "Metric-specific",
    date_basis: "Metric-specific",
    filter_logic: "Requested period",
    calculation_rules: "Chronological order",
    validation_or_output_rule: "Don't aggregate away periods"
  }
];

export function exportCatalog() {
  const columns = [
    "approach_type",
    "intent",
    "question_type",
    "operation",
    "columns_used",
    "date_basis",
    "filter_logic",
    "calculation_rules",
    "validation_or_output_rule"
  ];

  // Helper to escape CSV values
  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvHeader = columns.join(',');
  const csvRows = CATALOG_ROWS.map(r => [
    escapeCsv(r.approach_type),
    escapeCsv(r.intent),
    escapeCsv(r.question_type),
    escapeCsv(r.operation),
    escapeCsv(r.columns_used),
    escapeCsv(r.date_basis),
    escapeCsv(r.filter_logic),
    escapeCsv(r.calculation_rules),
    escapeCsv(r.validation_or_output_rule)
  ].join(','));

  const csvContent = [csvHeader, ...csvRows].join('\n');
  const jsonContent = JSON.stringify(CATALOG_ROWS, null, 2);

  const targets = [
    path.resolve(__dirname, '../storage/training/lead_policy_analytics_training_approaches.csv'),
    path.resolve(__dirname, '../storage/datasets/lead_policy_analytics_training_approaches.csv'),
    path.resolve(__dirname, '../server/src/assets/lead_policy_analytics_training_approaches.csv')
  ];

  const jsonTargets = [
    path.resolve(__dirname, '../storage/training/lead_policy_analytics_training_approaches.json'),
    path.resolve(__dirname, '../server/src/assets/lead_policy_analytics_training_approaches.json')
  ];

  for (const t of targets) {
    const dir = path.dirname(t);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(t, csvContent, 'utf-8');
    console.log(`Saved CSV: ${t}`);
  }

  for (const jt of jsonTargets) {
    const dir = path.dirname(jt);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jt, jsonContent, 'utf-8');
    console.log(`Saved JSON: ${jt}`);
  }

  console.log(`Successfully exported ${CATALOG_ROWS.length} training approaches.`);
}

exportCatalog();
