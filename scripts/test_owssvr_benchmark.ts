import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

interface BenchmarkItem {
  id: number;
  question: string;
  expected: string;
  type: string;
}

const BENCHMARK: BenchmarkItem[] = [
  { id: 1, question: "How many total records are in the CSV?", expected: "81,431", type: "count" },
  { id: 2, question: "How many unique dealers are in the dataset?", expected: "167", type: "unique" },
  { id: 3, question: "How many unique Agent Quoted values are there?", expected: "50", type: "unique" },
  { id: 4, question: "How many unique Sales Rep Name values are there, excluding blanks?", expected: "2,126", type: "unique" },
  { id: 5, question: "How many unique states are listed, excluding blanks?", expected: "27", type: "unique" },
  { id: 6, question: "How many unique insurance companies are listed, excluding blanks?", expected: "57", type: "unique" },
  { id: 7, question: "How many unique Line of Biz values are listed, excluding blanks?", expected: "5", type: "unique" },
  { id: 8, question: "How many unique payment methods are listed, excluding blanks?", expected: "5", type: "unique" },
  { id: 9, question: "How many unique Method values are listed, excluding blanks?", expected: "8", type: "unique" },
  { id: 10, question: "How many unique SHIPPER values are listed, excluding blanks?", expected: "72", type: "unique" },
  { id: 11, question: "How many records have Sold = Yes?", expected: "41,080", type: "filter_count" },
  { id: 12, question: "How many records have Sold = Issued?", expected: "19,115", type: "filter_count" },
  { id: 13, question: "How many records have Sold = No?", expected: "15,841", type: "filter_count" },
  { id: 14, question: "How many records have Sold = Quoted?", expected: "5,127", type: "filter_count" },
  { id: 15, question: "How many records have Sold = Cancelled?", expected: "268", type: "filter_count" },
  { id: 16, question: "What percentage of all records have Sold = Yes?", expected: "50.45%", type: "percentage" },
  { id: 17, question: "What percentage of all records have Sold = Issued?", expected: "23.47%", type: "percentage" },
  { id: 18, question: "How many records are either Sold = Yes or Sold = Issued?", expected: "60,195", type: "or_count" },
  { id: 19, question: "What percentage of all records are either Yes or Issued?", expected: "73.92%", type: "percentage" },
  { id: 20, question: "How many records have a blank State?", expected: "31,586", type: "blank" },
  { id: 21, question: "What percentage of records have a blank State?", expected: "38.79%", type: "percentage" },
  { id: 22, question: "How many records have a blank Line of Biz?", expected: "26,187", type: "blank" },
  { id: 23, question: "What percentage of records have a blank Line of Biz?", expected: "32.16%", type: "percentage" },
  { id: 24, question: "How many records have a blank Sales Rep Name?", expected: "604", type: "blank" },
  { id: 25, question: "How many records have a blank Ins Company?", expected: "6", type: "blank" },
  { id: 26, question: "How many records have a blank Down Pymt?", expected: "57", type: "blank" },
  { id: 27, question: "How many records have a blank Premium Amt?", expected: "115", type: "blank" },
  { id: 28, question: "How many records have a blank Date Sold?", expected: "20,744", type: "blank" },
  { id: 29, question: "How many records have a blank Pymt?", expected: "20,844", type: "blank" },
  { id: 30, question: "How many records have a blank Method?", expected: "20,728", type: "blank" },
  { id: 31, question: "How many records have a blank SHIPPER?", expected: "30,212", type: "blank" },
  { id: 32, question: "How many records have a blank POLICY#?", expected: "20,642", type: "blank" },
  { id: 33, question: "How many records have a blank STOCK #?", expected: "373", type: "blank" },
  { id: 34, question: "How many records have a blank VIN?", expected: "30,696", type: "blank" },
  { id: 35, question: "How many records have a blank MOBILE / CELL?", expected: "28,058", type: "blank" },
  { id: 36, question: "How many records have a blank MVR Ran?", expected: "71,497", type: "blank" },
  { id: 37, question: "What is the earliest Quote Date in the dataset?", expected: "January 3, 2017", type: "date_min" },
  { id: 38, question: "What is the latest Quote Date in the dataset?", expected: "June 3, 2026", type: "date_max" },
  { id: 39, question: "What is the earliest Date Sold in the dataset?", expected: "January 3, 2017", type: "date_min" },
  { id: 40, question: "What is the latest Date Sold in the dataset?", expected: "June 6, 2025", type: "date_max" },
  { id: 41, question: "How many quotes were recorded in 2025?", expected: "3,753", type: "year_count" },
  { id: 42, question: "How many policies have a Date Sold in 2025?", expected: "2,448", type: "year_count" },
  { id: 43, question: "How many quotes were recorded in 2026?", expected: "1", type: "year_count" },
  { id: 44, question: "Which Sold status has the most records?", expected: "Yes, with 41,080 records", type: "top_category" },
  { id: 45, question: "Which Agent Quoted has the most records?", expected: "Francisco, with 10,166 records", type: "top_category" },
  { id: 46, question: "Which dealer has the most records?", expected: "DT-IN-HIGHLAND, with 2,496 records", type: "top_category" },
  { id: 47, question: "Which state has the most records, excluding blanks?", expected: "Texas, with 9,319 records", type: "top_category" },
  { id: 48, question: "Which insurance company appears most often?", expected: "Progressive, with 20,795 records", type: "top_category" },
  { id: 49, question: "Which Line of Biz appears most often?", expected: "Auto, with 55,218 records", type: "top_category" },
  { id: 50, question: "Which payment type appears most often?", expected: "CC, with 41,465 records", type: "top_category" },
  { id: 51, question: "Which Method appears most often?", expected: "Co Esig, with 32,106 records", type: "top_category" },
  { id: 52, question: "What is the total Premium Amt across all records with a nonblank Premium Amt?", expected: "$117,288,854.19", type: "aggregate_sum" },
  { id: 53, question: "What is the average Premium Amt among records with a nonblank Premium Amt?", expected: "$1,442.38", type: "aggregate_avg" },
  { id: 54, question: "What is the minimum Premium Amt?", expected: "$0.00", type: "aggregate_min" },
  { id: 55, question: "What is the maximum Premium Amt?", expected: "$206,566.00", type: "aggregate_max" },
  { id: 56, question: "What is the total Down Pymt across all nonblank Down Pymt records?", expected: "$24,337,943.06", type: "aggregate_sum" },
  { id: 57, question: "What is the average Down Pymt among nonblank values?", expected: "$299.09", type: "aggregate_avg" },
  { id: 58, question: "What is the minimum Down Pymt?", expected: "$0.00", type: "aggregate_min" },
  { id: 59, question: "What is the maximum Down Pymt?", expected: "$348,308.00", type: "aggregate_max" },
  { id: 60, question: "How many records have Premium Amt greater than $2,000?", expected: "13,318", type: "filter_num" },
  { id: 61, question: "How many records have Down Pymt greater than $500?", expected: "7,825", type: "filter_num" },
  { id: 62, question: "How many Sold = Yes records have Premium Amt greater than $1,000?", expected: "20,425", type: "multi_filter" },
  { id: 63, question: "How many Auto records have Sold = Yes?", expected: "21,489", type: "multi_filter" },
  { id: 64, question: "How many Auto records have Sold = Issued?", expected: "19,106", type: "multi_filter" },
  { id: 65, question: "How many records have State populated and Line of Biz = Auto?", expected: "49,820", type: "multi_filter" },
  { id: 66, question: "How many Progressive records have Sold = Yes?", expected: "9,925", type: "multi_filter" },
  { id: 67, question: "What is the total Premium Amt for Progressive records?", expected: "$29,131,863.57", type: "aggregate_sum" },
  { id: 68, question: "How many records use CC as the payment type and have Sold = Yes?", expected: "24,635", type: "multi_filter" },
  { id: 69, question: "How many records use Co Esig as the Method and have Sold = Issued?", expected: "10,624", type: "multi_filter" },
  { id: 70, question: "What is the total Premium Amt for records with Sold = Yes?", expected: "$44,882,405.12", type: "aggregate_sum" },
  { id: 71, question: "What is the average Premium Amt for Sold = Yes records?", expected: "$1,093.01", type: "aggregate_avg" },
  { id: 72, question: "What is the total Premium Amt for Sold = Issued records?", expected: "$28,001,272.22", type: "aggregate_sum" },
  { id: 73, question: "What is the average Premium Amt for Sold = Issued records?", expected: "$1,464.88", type: "aggregate_avg" },
  { id: 74, question: "What is the total Premium Amt for Sold = No records?", expected: "$31,856,725.94", type: "aggregate_sum" },
  { id: 75, question: "What is the average Premium Amt for Sold = No records?", expected: "$2,023.55", type: "aggregate_avg" },
  { id: 76, question: "What is the total Premium Amt for Sold = Quoted records?", expected: "$12,201,817.53", type: "aggregate_sum" },
  { id: 77, question: "What is the average Premium Amt for Sold = Quoted records?", expected: "$2,379.91", type: "aggregate_avg" },
  { id: 78, question: "What is the total Premium Amt for Sold = Cancelled records?", expected: "$346,633.38", type: "aggregate_sum" },
  { id: 79, question: "What is the average Premium Amt for Sold = Cancelled records?", expected: "$1,293.41", type: "aggregate_avg" },
  { id: 80, question: "Which state has the highest total Premium Amt?", expected: "Florida, with $15,308,337.53", type: "top_metric" },
  { id: 81, question: "Which insurance company has the highest total Premium Amt?", expected: "Progressive, with $29,131,863.57", type: "top_metric" },
  { id: 82, question: "Which dealer has the highest total Premium Amt?", expected: "DT-IN-HIGHLAND, with $2,956,644.14", type: "top_metric" },
  { id: 83, question: "Which Agent Quoted has the highest total Premium Amt?", expected: "Francisco, with $15,599,259.34", type: "top_metric" },
  { id: 84, question: "Which Agent Sold has the highest total Premium Amt?", expected: "Francisco, with $9,491,003.61", type: "top_metric" },
  { id: 85, question: "Which Method has the highest total Premium Amt?", expected: "Co Esig, with $41,526,605.53", type: "top_metric" },
  { id: 86, question: "How many Auto records are there?", expected: "55,218", type: "filter_count" },
  { id: 87, question: "How many Boat records are there?", expected: "14", type: "filter_count" },
  { id: 88, question: "How many Antique Auto records are there?", expected: "9", type: "filter_count" },
  { id: 89, question: "How many Commercial Auto records are there?", expected: "2", type: "filter_count" },
  { id: 90, question: "How many Bonds records are there?", expected: "1", type: "filter_count" },
  { id: 91, question: "How many records have Sold = Cancelled and Line of Biz = Auto?", expected: "181", type: "multi_filter" },
  { id: 92, question: "How many records have Sold = Issued and Line of Biz = Auto?", expected: "19,106", type: "multi_filter" },
  { id: 93, question: "How many records have Sold = No and Line of Biz = Auto?", expected: "9,319", type: "multi_filter" },
  { id: 94, question: "How many records have Sold = Quoted and Line of Biz = Auto?", expected: "5,123", type: "multi_filter" },
  { id: 95, question: "How many records have Sold = Yes and Line of Biz = Auto?", expected: "21,489", type: "multi_filter" },
  { id: 96, question: "How many duplicate POLICY# values occur at least twice?", expected: "77", type: "duplicate" },
  { id: 97, question: "How many duplicate VIN values occur at least twice?", expected: "1,618", type: "duplicate" },
  { id: 98, question: "How many duplicate STOCK # values occur at least twice?", expected: "2,881", type: "duplicate" },
  { id: 99, question: "How many duplicate MOBILE / CELL values occur at least twice?", expected: "925", type: "duplicate" },
  { id: 100, question: "How many duplicate MVR Ran values occur at least twice?", expected: "0", type: "duplicate" }
];

async function run() {
  const file = fileProcessorService.getFileById('file-1790838940911-np8ae');
  if (!file) {
    console.error('File not found!');
    process.exit(1);
  }
  fileProcessorService.ensureDatasetPopulated(file);
  console.log(`Testing 100 benchmark questions on ${file.name}...`);

  let pass = 0;
  let fail = 0;
  const failureList: any[] = [];

  for (const item of BENCHMARK) {
    try {
      const sq = semanticLayer.parseQuestionToStructuredQuery(item.question, file);
      if (!sq) {
        failureList.push({ id: item.id, q: item.question, expected: item.expected, actual: 'SQ NULL' });
        fail++;
        continue;
      }
      const res = analyticsEngine.executeStructuredQuery(file.id, sq);
      const act = res.primaryMetric?.value || '';

      const expClean = item.expected.replace(/,/g, '').trim().toLowerCase();
      const actClean = act.replace(/,/g, '').trim().toLowerCase();

      let matched = (expClean === actClean);
      if (!matched && item.type.startsWith('top_')) {
        const firstRow = res.dataResult?.[0];
        const cat = firstRow ? String(Object.values(firstRow)[0]).toLowerCase() : '';
        if (cat && item.expected.toLowerCase().includes(cat)) {
          matched = true;
        }
      }

      if (matched) {
        pass++;
      } else {
        fail++;
        failureList.push({ id: item.id, q: item.question, expected: item.expected, actual: act, sq });
      }
    } catch (err: any) {
      fail++;
      failureList.push({ id: item.id, q: item.question, expected: item.expected, error: err.message });
    }
  }

  console.log(`\n=== RESULTS: Passed: ${pass} / 100 | Failed: ${fail} / 100 ===\n`);
  for (const f of failureList) {
    console.log(`Q${f.id}: "${f.q}"`);
    console.log(`   Expected: ${f.expected}`);
    console.log(`   Actual:   ${f.actual || f.error}`);
    if (f.sq) console.log(`   SQ:`, JSON.stringify(f.sq));
  }
}

run().catch(console.error);
