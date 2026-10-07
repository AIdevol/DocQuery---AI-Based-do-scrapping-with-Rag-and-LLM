#!/usr/bin/env python3
"""
Synthetic Training Dataset Generator & Evaluation Split Builder
Implements Sections 12, 13, and 14:
"Don't train the model to memorize data-analysis answers. Train it to translate language into analytical operations."
"""

import os
import sys
import json
import random
from typing import List, Dict, Any
from analytics_engine import load_csv, execute_query


SYSTEM_PROMPT = """You are a Text-to-Data-Analysis Agent. Your task is to translate user natural-language questions about a dataset into an intermediate structured analytical query JSON.
Do not calculate numbers yourself. Output valid JSON representing the exact analytical operation.
Format:
{
  "operation": "group_count|unique_count|total_records|top_category|bottom_category|aggregate",
  "dimension": "<column_name>",
  "measure": "count|sum|avg|min|max",
  "metricColumn": "<numeric_column>",
  "filters": [{"column": "<name>", "operator": "eq|neq|gt|lt", "value": "<val>"}],
  "include_missing": true|false,
  "sort": "desc|asc",
  "limit": <number>
}"""


QUESTION_TEMPLATES = [
    # Group counts / distributions
    {
        "intent": "group_count",
        "measure": "count",
        "sort": "desc",
        "include_missing": True,
        "phrasings": [
            "How many leads are there from each {col}?",
            "Show leads by {col}.",
            "Break down leads by {col}.",
            "Give me the {col} distribution.",
            "What is our {col} mix?",
            "Show me the number of records by {col}.",
            "Distribution of leads across {col}.",
            "Count records per {col}.",
            "Provide a breakdown of leads grouped by {col}."
        ]
    },
    # Top Category
    {
        "intent": "top_category",
        "measure": "count",
        "sort": "desc",
        "limit": 1,
        "include_missing": True,
        "phrasings": [
            "Which {col} has the most leads?",
            "What is the top {col}?",
            "Which {col} generated the highest number of leads?",
            "Where are most of our leads coming from by {col}?",
            "What is the highest volume {col}?",
            "Identify the number one {col} by lead count."
        ]
    },
    # Bottom Category
    {
        "intent": "bottom_category",
        "measure": "count",
        "sort": "asc",
        "limit": 1,
        "include_missing": True,
        "phrasings": [
            "Which {col} has the least leads?",
            "What is the lowest {col}?",
            "Which {col} generated the fewest leads?",
            "Identify the bottom {col} by record volume.",
            "What is the smallest {col} by count?"
        ]
    },
    # Unique Count
    {
        "intent": "unique_count",
        "include_missing": False,
        "phrasings": [
            "How many unique {col}s are there?",
            "How many distinct {col} exist?",
            "Count distinct {col}.",
            "What is the number of different {col} represented in the dataset?",
            "How many separate {col}s do we have?"
        ]
    },
    # Total Records
    {
        "intent": "total_records",
        "phrasings": [
            "How many leads are there?",
            "What is the total number of leads?",
            "How many total records exist in this file?",
            "Count all rows.",
            "What is the total lead volume?"
        ]
    }
]

def generate_response_by_agent_sold(self, csv_path:str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    # row

def generate_dataset(csv_path: str, output_dir: str, num_samples: int = 250):
    os.makedirs(output_dir, exist_ok=True)
    rows = load_csv(csv_path)
    total_rows = len(rows)
    print(f"Loaded {total_rows:,} records from {csv_path}")

    # Key categorical dimensions from dataset
    dimensions = ["Lead Source", "Lead Type", "State", "Ins Company", "Agent Sold", "Customer Type"]
    numeric_columns = ["Premium Amt", "Down Pymt"]

    examples = []

    # 1. Generate template-based variations
    for tmpl in QUESTION_TEMPLATES:
        op = tmpl["intent"]
        phrasings = tmpl["phrasings"]

        if op == "total_records":
            for phrase in phrasings:
                target_query = {"operation": "total_records"}
                gt = execute_query(rows, target_query)
                examples.append({
                    "question": phrase,
                    "target_query": target_query,
                    "ground_truth": {
                        "primary_metric": gt["primary_metric"],
                        "total_records": gt["total_records_analyzed"]
                    }
                })
        else:
            for dim in dimensions:
                for phrase in phrasings:
                    q_text = phrase.format(col=dim)
                    target_query = {
                        "operation": op,
                        "dimension": dim,
                        "include_missing": tmpl.get("include_missing", True)
                    }
                    if "measure" in tmpl: target_query["measure"] = tmpl["measure"]
                    if "sort" in tmpl: target_query["sort"] = tmpl["sort"]
                    if "limit" in tmpl: target_query["limit"] = tmpl["limit"]

                    gt = execute_query(rows, target_query)
                    examples.append({
                        "question": q_text,
                        "target_query": target_query,
                        "ground_truth": {
                            "primary_metric": gt["primary_metric"],
                            "data_preview": gt["data"][:3]
                        }
                    })

    # 2. Add Filtered Queries (e.g. State = 'Arizona', Lead Type = 'Auto')
    filter_scenarios = [
        ("Auto", "Lead Type", "State"),
        ("Arizona", "State", "Lead Source"),
        ("Texas", "State", "Lead Type"),
        ("Web", "Lead Source", "State"),
        ("Issued", "Sold", "Lead Source")
    ]

    for filter_val, filter_col, group_col in filter_scenarios:
        q_phrases = [
            f"How many {filter_val} leads are there by {group_col}?",
            f"Show {group_col} breakdown for {filter_val} records.",
            f"Breakdown of {filter_val} leads across {group_col}."
        ]
        for q_text in q_phrases:
            target_query = {
                "operation": "group_count",
                "dimension": group_col,
                "measure": "count",
                "filters": [{"column": filter_col, "operator": "eq", "value": filter_val}],
                "sort": "desc",
                "include_missing": True
            }
            gt = execute_query(rows, target_query)
            examples.append({
                "question": q_text,
                "target_query": target_query,
                "ground_truth": {
                    "primary_metric": gt["primary_metric"],
                    "data_preview": gt["data"][:3]
                }
            })

    # Shuffle examples
    random.seed(42)
    random.shuffle(examples)

    # Convert to standard Chat/Instruction fine-tuning format
    chat_dataset = []
    for ex in examples:
        chat_entry = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": ex["question"]},
                {"role": "assistant", "content": json.dumps(ex["target_query"], indent=2)}
            ],
            "metadata": {
                "question": ex["question"],
                "target_query": ex["target_query"],
                "ground_truth_primary_metric": ex["ground_truth"]["primary_metric"]
            }
        }
        chat_dataset.append(chat_entry)

    # Split 80/20 train/eval
    split_idx = int(len(chat_dataset) * 0.8)
    train_data = chat_dataset[:split_idx]
    eval_data = chat_dataset[split_idx:]

    train_path = os.path.join(output_dir, "dataset_train.jsonl")
    eval_path = os.path.join(output_dir, "dataset_eval.jsonl")

    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item) + "\n")

    with open(eval_path, "w", encoding="utf-8") as f:
        for item in eval_data:
            f.write(json.dumps(item) + "\n")

    print(f"\nSuccessfully generated training dataset:")
    print(f"Total training examples: {len(train_data)} -> {train_path}")
    print(f"Total evaluation examples: {len(eval_data)} -> {eval_path}")

    # Print sample
    print("\n--- Sample Training Example ---")
    sample = train_data[0]
    print(f"User: {sample['messages'][1]['content']}")
    print(f"Assistant (Target Query):\n{sample['messages'][2]['content']}")
    print(f"Ground Truth Metric: {sample['metadata']['ground_truth_primary_metric']}")


def main():
    csv_file = "storage/datasets/file-1790160357121-8in8p_All_Leads__7_.csv"
    if not os.path.exists(csv_file):
        # Check if alternative path exists
        datasets_dir = "storage/datasets"
        if os.path.exists(datasets_dir):
            files = [os.path.join(datasets_dir, f) for f in os.listdir(datasets_dir) if f.endswith(".csv")]
            if files:
                csv_file = files[0]

    output_dir = "storage/training"
    generate_dataset(csv_file, output_dir)


if __name__ == "__main__":
    main()

