import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const all200Questions = [
  // Lead / Partner
  "1. How many total leads are there?",
  "2. What are the Lead Sources?",
  "3. How many leads are from Nexus?",
  "4. How many leads are from RR 3.0?",
  "5. How many Partner Codes are available?",
  "6. How many Partner Codes are blank?",
  "7. What are the Partner Names?",
  "8. How many leads have Partner Name as Nexus?",
  "9. What are the Lead Types?",
  "10. How many Auto leads are there?",
  "11. How many Home leads are there?",
  "12. How many Renters leads are there?",
  "13. How many leads have a blank Lead Type?",
  "14. How many Dealer records are there?",
  "15. How many Sales Reps are there?",
  "16. How many Sales Rep fields are blank?",
  "17. Which is the most common Lead Source?",
  "18. Which is the most common Lead Type?",
  "19. How many leads are from All Other?",
  "20. How many leads are from Web Quote?",
  // Customer
  "21. How many First Names are blank?",
  "22. How many Last Names are blank?",
  "23. How many unique First Names are there?",
  "24. What are the Customer Types?",
  "25. How many Personal customers are there?",
  "26. How many Customer Type fields are blank?",
  "27. How many leads have an Email?",
  "28. How many Email fields are blank?",
  "29. How many leads have a Phone Number?",
  "30. How many Phone fields are blank?",
  "31. How many leads have an Alternative Phone?",
  "32. How many Alternative Phone fields are blank?",
  "33. How many leads have a Date of Birth?",
  "34. How many Date of Birth fields are blank?",
  "35. How many leads are in each State?",
  "36. How many leads are from Arizona?",
  "37. How many leads are from Texas?",
  "38. How many leads are from Illinois?",
  "39. How many leads are from California?",
  "40. How many leads are from Florida?",
  // Vehicle
  "41. How many leads have a Vehicle Year?",
  "42. How many Vehicle Year fields are blank?",
  "43. How many 2025 vehicles are there?",
  "44. How many 2026 vehicles are there?",
  "45. How many 2024 vehicles are there?",
  "46. How many 2023 vehicles are there?",
  "47. How many 2022 vehicles are there?",
  "48. How many 2021 vehicles are there?",
  "49. How many 2020 vehicles are there?",
  "50. How many 2019 vehicles are there?",
  "51. How many Vehicle Makes are available?",
  "52. How many Vehicle Make fields are blank?",
  "53. How many Toyota vehicles are there?",
  "54. How many Honda vehicles are there?",
  "55. How many Ford vehicles are there?",
  "56. How many Chevrolet vehicles are there?",
  "57. How many Hyundai vehicles are there?",
  "58. How many Nissan vehicles are there?",
  "59. How many Kia vehicles are there?",
  "60. How many Jeep vehicles are there?",
  // VIN
  "61. How many leads have a VIN?",
  "62. How many VIN fields are blank?",
  "63. How many unique VINs are there?",
  "64. How many duplicate VINs are there?",
  "65. How many 17-character VINs are there?",
  "66. How many invalid VINs are there?",
  "67. How many leads have the same VIN?",
  "68. How many Auto leads have a missing VIN?",
  "69. How many Home leads have a VIN?",
  "70. How many Renters leads have a VIN?",
  // Quote
  "71. How many leads have an Agent Quoted?",
  "72. How many Agent Quoted fields are blank?",
  "73. How many leads have a Quoted Date?",
  "74. How many Quoted Date fields are blank?",
  "75. How many unique Agent Quoted names are there?",
  "76. How many leads are Quoted?",
  "77. What percentage of leads are Quoted?",
  "78. How many leads have a Quote ID?",
  "79. How many Quote ID fields are blank?",
  "80. How many unique Quote IDs are there?",
  // Sold
  "81. How many leads have an Agent Sold?",
  "82. How many Agent Sold fields are blank?",
  "83. How many leads are Sold?",
  "84. How many Sold fields are blank?",
  "85. How many leads are Issued?",
  "86. How many leads have a Date Sold?",
  "87. How many Date Sold fields are blank?",
  "88. How many leads have an Effective Date?",
  "89. How many Effective Date fields are blank?",
  "90. How many unique Agent Sold names are there?",
  // Insurance
  "91. What Insurance Companies are listed?",
  "92. How many Progressive leads are there?",
  "93. How many Travelers leads are there?",
  "94. How many Gainsco leads are there?",
  "95. How many Assurance America leads are there?",
  "96. How many unique Insurance Companies are there?",
  "97. How many Insurance Company fields are blank?",
  "98. How many Progressive policies are Issued?",
  "99. How many Progressive leads are Quoted?",
  "100. How many Progressive leads are Sold?",
  // Payment
  "101. How many leads have a Down Payment?",
  "102. How many Down Payment fields are blank?",
  "103. What Payment Methods are used?",
  "104. How many leads use CC payment?",
  "105. How many leads use Co Esig?",
  "106. How many leads have a Premium Amount?",
  "107. How many Premium Amount fields are blank?",
  "108. What is the total Premium Amount?",
  "109. What is the average Premium Amount?",
  "110. What is the highest Premium Amount?",
  // Policy
  "111. How many leads have a Policy Number?",
  "112. How many Policy Number fields are blank?",
  "113. How many unique Policy Numbers are there?",
  "114. How many duplicate Policy Numbers are there?",
  "115. How many Issued policies are there?",
  "116. How many Quoted policies are there?",
  "117. How many Sold policies are there?",
  "118. How many Auto leads have a Policy Number?",
  "119. How many Home leads have a Policy Number?",
  "120. How many Renters leads have a Policy Number?",
  // Location
  "121. How many Cities are listed?",
  "122. How many City fields are blank?",
  "123. How many unique Cities are there?",
  "124. How many leads have a Garaging ZIP?",
  "125. How many Garaging ZIP fields are blank?",
  "126. How many leads have a Garaging State?",
  "127. How many Garaging State fields are blank?",
  "128. How many leads are from Arizona ZIP codes?",
  "129. How many leads are from Texas ZIP codes?",
  "130. How many leads are from Illinois ZIP codes?",
  // Line of Business
  "131. What are the Lines of Business?",
  "132. How many Auto leads are there?",
  "133. How many MC leads are there?",
  "134. How many Dwelling Fire leads are there?",
  "135. How many Line of Biz fields are blank?",
  "136. How many Auto leads have a VIN?",
  "137. How many Auto leads do not have a VIN?",
  "138. How many Home leads are there?",
  "139. How many Renters leads are there?",
  "140. How many MC leads are there?",
  // Agent
  "141. How many leads have a Home Agent Assigned?",
  "142. How many Home Agent fields are blank?",
  "143. How many unique assigned agents are there?",
  "144. How many leads have the same Agent Sold and Home Agent?",
  "145. How many leads have the same Agent Quoted and Agent Sold?",
  "146. How many leads have Agent Quoted but no Agent Sold?",
  "147. How many leads have Agent Sold but no Agent Quoted?",
  "148. How many assigned agents are there by State?",
  "149. How many assigned agents are there by Lead Source?",
  "150. How many assigned agents are there by Lead Type?",
  // Date
  "151. How many leads have an Added Time?",
  "152. How many leads have a Modified Time?",
  "153. How many leads were added in September 2026?",
  "154. How many leads were added in August 2026?",
  "155. How many leads were added on September 23, 2026?",
  "156. How many leads were added on September 24, 2026?",
  "157. How many leads were added today?",
  "158. How many leads were modified today?",
  "159. How many leads have the same Added and Modified date?",
  "160. How many leads were Sold in September?",
  // Data Quality
  "161. How many leads have a Lead ID?",
  "162. How many Lead ID fields are blank?",
  "163. How many unique Lead IDs are there?",
  "164. How many duplicate Lead IDs are there?",
  "165. How many leads have an ID?",
  "166. How many ID fields are blank?",
  "167. How many leads have a Modified User?",
  "168. How many Modified User fields are blank?",
  "169. How many leads have Notes?",
  "170. How many Notes fields are blank?",
  // Combinations
  "171. How many Nexus Auto leads are there?",
  "172. How many Nexus Renters leads are there?",
  "173. How many RR 3.0 Auto leads are there?",
  "174. How many Web Quote Auto leads are there?",
  "175. How many DriveTime Auto leads are there?",
  "176. How many Progressive Auto leads are there?",
  "177. How many Issued Auto leads are there?",
  "178. How many Quoted Auto leads are there?",
  "179. How many Sold Auto leads are there?",
  "180. How many Arizona Auto leads are there?",
  // Advanced
  "181. How many Sold leads have a Premium Amount?",
  "182. How many Quoted leads have a Premium Amount?",
  "183. How many Issued leads have a Policy Number?",
  "184. How many Auto leads have a Policy Number?",
  "185. How many leads have both Email and Phone?",
  "186. How many leads have Email but no Phone?",
  "187. How many leads have Phone but no Email?",
  "188. How many leads have both DOB and Email?",
  "189. How many leads have both ZIP and State?",
  "190. How many leads have both VIN and Vehicle Make?",
  // Comparison
  "191. How many Auto vs. Home leads are there?",
  "192. How many Quoted vs. Sold leads are there?",
  "193. How many Issued vs. Quoted leads are there?",
  "194. How many Nexus vs. RR 3.0 leads are there?",
  "195. How many Arizona vs. Texas leads are there?",
  "196. How many Progressive vs. Travelers leads are there?",
  "197. How many 2025 vs. 2026 vehicles are there?",
  "198. How many Personal vs. Business customers are there?",
  "199. How many leads have data vs. blank records?",
  "200. How many complete records are there?"
];

async function testAll() {
  const file = fileProcessorService.getAllFiles()[0];
  const issues: { num: number; q: string; reason: string; val?: any; op?: string }[] = [];
  const passes: { num: number; q: string; val: any; op: string }[] = [];

  for (const rawQ of all200Questions) {
    const match = rawQ.match(/^(\d+)\.\s*(.*)$/);
    const num = match ? parseInt(match[1], 10) : 0;
    const cleanQ = match ? match[2] : rawQ;

    const sq = semanticLayer.parseQuestionToStructuredQuery(cleanQ, file);
    if (!sq) {
      issues.push({ num, q: cleanQ, reason: 'parseQuestionToStructuredQuery returned null' });
      continue;
    }

    const res = analyticsEngine.executeStructuredQuery(file.id, sq);
    const valStr = String(res.primaryMetric.value).replace(/,/g, '');

    // Suspicious if total_records returned full 38,469 when question asked for a specific entity or count
    if (sq.operation === 'total_records' && (!sq.filters || sq.filters.length === 0) && num !== 1 && num !== 14 && num !== 15) {
      issues.push({ num, q: cleanQ, reason: 'total_records without filters (returned entire dataset 38,469)', val: res.primaryMetric.value, op: sq.operation });
    } else {
      passes.push({ num, q: cleanQ, val: res.primaryMetric.value, op: sq.operation });
    }
  }

  console.log(`Total questions: ${all200Questions.length}`);
  console.log(`Passed: ${passes.length}`);
  console.log(`Issues found: ${issues.length}`);
  console.log('\n--- ALL ISSUES ---');
  for (const iss of issues) {
    console.log(`Q${iss.num}: "${iss.q}" -> ${iss.reason} (op: ${iss.op || 'none'}, val: ${iss.val || 'none'})`);
  }
}

testAll().catch(console.error);
