import { fileProcessorService } from '../server/src/services/fileProcessor.js';

const file = fileProcessorService.getAllFiles()[0];
const dataset = fileProcessorService.getFullDataset(file.id);

let quotedDateNotNull = 0;
let quotedDateAndIssued = 0;
let partnerWebQuote = 0;
let partnerAllOther = 0;

for (const r of dataset) {
  const qd = String(r['Quoted Date'] || '').trim();
  const s = String(r['Sold'] || '').trim();
  const pn = String(r['Partner Name'] || '').trim();
  if (qd) {
    quotedDateNotNull++;
    if (s.toLowerCase() === 'issued') {
      quotedDateAndIssued++;
    }
  }
  if (pn === 'Web Quote') partnerWebQuote++;
  if (pn === 'All Other') partnerAllOther++;
}

console.log('Quoted Date not null:', quotedDateNotNull);
console.log('Quoted Date not null AND Sold == Issued:', quotedDateAndIssued);
console.log('Close rate:', (quotedDateAndIssued / quotedDateNotNull * 100).toFixed(2) + '%');
console.log('Partner Web Quote:', partnerWebQuote);
console.log('Partner All Other:', partnerAllOther);
