import fs from 'fs';
import path from 'path';
import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const files = fileProcessorService.getAllFiles();
console.log('Total files:', files.length);
if (files.length === 0) {
  console.error('No files found!');
  process.exit(1);
}

const file = files[0];
console.log('Using file:', file.name, 'Rows:', file.schema?.rowCount);

const testQuestions = [
  'How many total leads are there?',
  'How many unique Lead Sources are there?',
  'How many leads are there from each Lead Source?',
  'Which Lead Source has the most leads?',
  'Which Lead Source has the fewest leads?',
  'How many total Lead Types are there?',
  'How many leads are there for each Lead Type?',
  'Which Lead Type is the most common?',
  'How many total States are there?',
  'How many leads are there from each State?',
  'Which State has the most leads?',
  'Which State has the fewest leads?',
  'How many leads are from Arizona?',
  'How many leads are from Texas?',
  'How many leads are from Georgia?',
  'How many leads are from Florida?',
  'How many leads are from California?',
  'How many total Sales Reps are there?',
  'How many leads does each Sales Rep have?',
  'Which Sales Rep has the most leads?',
  'How many total Dealers are there?',
  'How many leads does each Dealer have?',
  'Which Dealer has the most leads?',
  'How many total Insurance Companies are there?',
  'How many leads does each Insurance Company have?',
  'Which Insurance Company has the most leads?',
  'How many leads are with Progressive?',
  'How many leads are with GEICO?',
  'How many leads are with Root?',
  'How many total Customer Types are there?',
  'How many leads are there for each Customer Type?',
  'How many leads are Personal Customers?',
  'How many leads are Commercial Customers?',
  'How many total Lines of Business are there?',
  'How many leads are there for each Line of Business?',
  'Which Line of Business has the most leads?',
  'How many leads are in the Auto Line of Business?',
  'How many leads are in the Home Line of Business?',
  'How many leads are in the Renters Line of Business?',
  'How many leads are in the Commercial Line of Business?',
  'How many total leads have a Sold status?',
  'How many leads are there for each Sold status?',
  'How many leads have the status Issued?',
  'How many leads have the status Quoted?',
  'How many leads have the status Called?',
  'How many leads have the status Flat Cancel?',
  'Which Sold status has the most leads?',
  'How many total Agent Sold are there?',
  'How many leads does each Agent Sold have?',
  'Which Agent Sold has the most leads?',
  'How many leads does Francisco have?',
  'How many leads does Marissa have?',
  'How many leads does Amalia have?',
  'How many leads does Jose have?',
  'How many leads does Jailen Clark have?',
  'How many total Payment Methods are there?',
  'How many leads are there for each Payment Method?',
  'Which Payment Method is used the most?',
  'How many leads use the Co Esig payment method?',
  'How many leads use the ZOHO SIGN payment method?',
  'How many leads use the In Person payment method?',
  'How many leads use the Mail payment method?',
  'How many leads have a Vehicle Make available?',
  'How many leads have a Vehicle Year available?',
  'How many leads have a Vehicle VIN available?',
  'How many leads have a Phone Number available?',
  'How many leads have an Email available?',
  'How many leads have a State available?',
  'How many leads have a Garaging Zip available?',
  'How many leads have a Date of Birth available?',
  'how many polices sold in may and august',
  'how many policies sold in july',
  'How many policies sold in May group by agent?'
];

let nullCount = 0;
let successCount = 0;

for (const q of testQuestions) {
  const sq = semanticLayer.parseQuestionToStructuredQuery(q, file);
  if (!sq) {
    console.log('FAIL: NULL query for:', q);
    nullCount++;
  } else {
    try {
      const res = analyticsEngine.executeStructuredQuery(file.id, sq);
      console.log(`OK: "${q}" -> op=${sq.operation}, dim=${sq.dimension || 'none'}, metric=${res.primaryMetric.value}`);
      successCount++;
    } catch (e: any) {
      console.log(`EXEC FAIL: "${q}" ->`, e.message);
      nullCount++;
    }
  }
}

console.log(`\nSUMMARY: Success: ${successCount}, Failed: ${nullCount} out of ${testQuestions.length}`);
