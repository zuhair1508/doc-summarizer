// Generates the fictional SaaS agreement sample PDF.
// Usage: node scripts/make-contract.mjs  ->  public/samples/saas-agreement.pdf
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";

const TITLE = "MASTER SUBSCRIPTION AGREEMENT";
const BANNER = "FICTIONAL SAMPLE FOR DEMONSTRATION ONLY. Not legal advice. All names are invented.";

const sections = [
  [null, `This Master Subscription Agreement (the "Agreement") is entered into as of January 15, 2026 (the "Effective Date") by and between Lumen Ridge Software, Inc., a Delaware corporation with offices at 400 Alder Street, Wilmington, DE ("Provider"), and Harbor & Pine Outfitters LLC, an Oregon limited liability company with offices at 12 Quarry Road, Bend, OR ("Customer"). Provider and Customer are each a "Party" and together the "Parties".`],
  ["1. Definitions", `1.1 "Services" means Provider's hosted inventory forecasting platform known as "Ridgeline", including all updates made generally available during the Term.
1.2 "Customer Data" means all data, files and content submitted to the Services by or on behalf of Customer, including sales history, supplier records and store-level inventory counts.
1.3 "Authorized Users" means Customer's employees and contractors who are permitted by Customer to access the Services, up to the number of seats stated in the Order Form.
1.4 "Order Form" means the ordering document executed by both Parties that references this Agreement. The initial Order Form is attached as Exhibit A.
1.5 "Usage Data" means technical logs, performance metrics and statistical information derived from the operation of the Services, including information derived from Customer Data.`],
  ["2. Services and Access", `2.1 Provision of Services. Provider will make the Services available to Customer's Authorized Users during the Term in accordance with this Agreement and the applicable Order Form.
2.2 Onboarding. Provider will complete initial configuration and data import within thirty (30) days after Customer delivers its historical sales data in the format specified in Provider's onboarding guide. Customer shall deliver such data no later than February 14, 2026. Delays caused by Customer's late delivery do not delay the start of billing.
2.3 Restrictions. Customer shall not (a) resell or sublicense the Services, (b) reverse engineer the Services, (c) use the Services to build a competing product, or (d) exceed the seat count without purchasing additional seats.
2.4 Acceptable Use Policy. Customer shall comply with Provider's Acceptable Use Policy, which Provider may update from time to time by posting a revised version on its website. Updates are effective fifteen (15) days after posting. Continued use of the Services after that date constitutes acceptance of the updated policy.`],
  ["3. Fees and Payment", `3.1 Fees. Customer shall pay the fees stated in the Order Form. The initial annual subscription fee is USD 84,000 for 60 seats, invoiced annually in advance.
3.2 Payment Terms. Invoices are due net fifteen (15) days from the invoice date. Overdue amounts accrue a late charge of 1.5% per month, or the maximum permitted by law if lower.
3.3 Price Adjustments. Provider may increase fees for any Renewal Term by up to twelve percent (12%) over the fees for the preceding term by giving Customer written notice at least thirty (30) days before the start of the Renewal Term.
3.4 Suspension. If any undisputed amount remains unpaid more than ten (10) days after written notice of non-payment, Provider may suspend access to the Services until payment is received in full.
3.5 Taxes. Fees exclude taxes. Customer is responsible for all sales, use and similar taxes, other than taxes on Provider's net income.`],
  ["4. Term and Renewal", `4.1 Initial Term. This Agreement begins on the Effective Date and continues for twelve (12) months (the "Initial Term").
4.2 Automatic Renewal. Upon expiry of the Initial Term, this Agreement automatically renews for successive periods of twenty-four (24) months each (each a "Renewal Term") unless either Party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term.
4.3 Termination for Cause. Either Party may terminate this Agreement if the other Party materially breaches it and fails to cure the breach within thirty (30) days after receiving written notice describing the breach.
4.4 No Termination for Convenience. Except as expressly stated in this Section 4, fees are non-cancellable and non-refundable, and Customer may not terminate this Agreement for convenience.`],
  ["5. Customer Data", `5.1 Ownership. As between the Parties, Customer owns all Customer Data.
5.2 License to Provider. Customer grants Provider a worldwide, non-exclusive license to host, copy and process Customer Data as necessary to provide the Services.
5.3 Usage Data. Provider may collect and use Usage Data for any lawful purpose, including to improve the Services and to develop and train Provider's machine learning models, provided that Provider does not disclose Usage Data in a form that identifies Customer by name. This right survives termination of this Agreement.
5.4 Security. Provider will maintain administrative, physical and technical safeguards designed to protect Customer Data, as described in Provider's Security Overview, which Provider may update provided that updates do not materially reduce overall protection.
5.5 Data Export and Deletion. For thirty (30) days following termination or expiry, Customer may export Customer Data using the standard export tools. After that period, Provider will delete Customer Data from production systems. Backups are deleted in the ordinary course, within one hundred eighty (180) days.`],
  ["6. Service Levels", `6.1 Availability. Provider will use commercially reasonable efforts to make the Services available 99.5% of the time in each calendar month, excluding scheduled maintenance announced at least 48 hours in advance and events outside Provider's reasonable control.
6.2 Service Credits. If availability falls below 99.5% in a month, Customer may request a credit equal to 2% of that month's pro-rated fees for each full 1% below the target, up to a maximum of 5% of that month's fees. Customer must request credits within fifteen (15) days after the end of the affected month.
6.3 Exclusive Remedy. Service credits are Customer's sole and exclusive remedy for any failure to meet the availability target.
6.4 Support. Standard support is available by email, Monday through Friday, 8:00 a.m. to 6:00 p.m. Pacific Time, with a target first response time of one (1) business day.`],
  ["7. Confidentiality", `7.1 Each Party shall protect the other Party's Confidential Information using at least reasonable care and use it only to perform under this Agreement.
7.2 These obligations continue for three (3) years after termination, except for trade secrets, which remain protected for as long as they qualify as trade secrets under applicable law.`],
  ["8. Warranties and Disclaimers", `8.1 Provider warrants that the Services will perform materially in accordance with the published documentation. Customer's exclusive remedy for breach of this warranty is for Provider to correct the non-conformity or, if Provider cannot do so within a reasonable time, for either Party to terminate the affected Order Form and for Provider to refund prepaid fees for the remaining period.
8.2 Forecasts, recommendations and reorder suggestions generated by the Services are estimates only. Provider does not warrant their accuracy, and Customer is solely responsible for purchasing and inventory decisions.
8.3 EXCEPT AS EXPRESSLY STATED IN THIS AGREEMENT, THE SERVICES ARE PROVIDED "AS IS" AND PROVIDER DISCLAIMS ALL OTHER WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.`],
  ["9. Limitation of Liability", `9.1 NEITHER PARTY WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES, OR FOR LOST PROFITS OR REVENUE, EVEN IF ADVISED OF THEIR POSSIBILITY.
9.2 EACH PARTY'S TOTAL LIABILITY ARISING OUT OF THIS AGREEMENT WILL NOT EXCEED THE FEES PAID OR PAYABLE BY CUSTOMER IN THE THREE (3) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.
9.3 The limits in Section 9.2 do not apply to Customer's payment obligations or to either Party's breach of Section 7 (Confidentiality).`],
  ["10. Indemnification", `10.1 Provider will defend Customer against third-party claims alleging that the Services infringe a United States patent, copyright or trademark, and will pay damages finally awarded, provided Customer promptly notifies Provider and gives Provider sole control of the defense.
10.2 Customer will defend Provider against third-party claims arising from Customer Data or from Customer's use of the Services in violation of this Agreement.`],
  ["11. General", `11.1 Notices. Legal notices must be sent by email to legal@lumenridge.example (for Provider) or to the email address in the Order Form (for Customer), with a copy by courier. Notices of non-renewal are effective only when sent to legal@lumenridge.example.
11.2 Assignment. Neither Party may assign this Agreement without the other Party's consent, except that Provider may assign it without consent in connection with a merger, acquisition or sale of substantially all of its assets.
11.3 Governing Law. This Agreement is governed by the laws of the State of Delaware. The Parties submit to the exclusive jurisdiction of the state and federal courts located in New Castle County, Delaware.
11.4 Publicity. Provider may identify Customer as a customer by name and logo in its marketing materials unless Customer opts out in writing.
11.5 Entire Agreement. This Agreement, together with all Order Forms, is the entire agreement between the Parties and supersedes all prior agreements regarding its subject matter.`],
  ["Exhibit A: Initial Order Form", `Subscription: Ridgeline Forecasting, Professional Edition
Seats: 60 Authorized Users
Subscription Fee: USD 84,000 per year, invoiced annually in advance
Onboarding Fee: USD 9,500, one-time, invoiced on the Effective Date
Initial Term: January 15, 2026 to January 14, 2027
Non-renewal notice deadline for Initial Term: October 16, 2026
Customer notice email: operations@harborpine.example
Customer contact: Dana Whitfield, Director of Operations
Provider contact: Sam Okafor, Account Executive`],
  ["Signatures", `LUMEN RIDGE SOFTWARE, INC.
By: Priya Natarajan    Title: Chief Revenue Officer    Date: January 12, 2026

HARBOR & PINE OUTFITTERS LLC
By: Dana Whitfield    Title: Director of Operations    Date: January 15, 2026`],
];

const pdf = await PDFDocument.create();
pdf.setTitle("Master Subscription Agreement (fictional sample)");
const font = await pdf.embedFont(StandardFonts.TimesRoman);
const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
const W = 612, H = 792, M = 72, SIZE = 11, LEAD = 15;
let page, y, pageNo = 0;

function newPage() {
  page = pdf.addPage([W, H]);
  pageNo++;
  page.drawText(BANNER, { x: M, y: H - 40, size: 8, font, color: rgb(0.6, 0.1, 0.1) });
  page.drawText(`Page ${pageNo}`, { x: W / 2 - 15, y: 36, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y = H - M;
}
function wrap(text, f, size, width) {
  const lines = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
  }
  return lines;
}
function write(text, f = font, size = SIZE, gapAfter = 6) {
  for (const line of wrap(text, f, size, W - 2 * M)) {
    if (y < M) newPage();
    page.drawText(line, { x: M, y, size, font: f });
    y -= LEAD;
  }
  y -= gapAfter;
}

newPage();
page.drawText(TITLE, { x: W / 2 - bold.widthOfTextAtSize(TITLE, 16) / 2, y, size: 16, font: bold });
y -= 34;
for (const [heading, body] of sections) {
  if (heading) {
    if (y < M + 60) newPage();
    write(heading, bold, 12, 2);
  }
  for (const para of body.split("\n")) write(para);
}

fs.mkdirSync("public/samples", { recursive: true });
fs.writeFileSync("public/samples/saas-agreement.pdf", await pdf.save());
console.log(`wrote public/samples/saas-agreement.pdf (${pageNo} pages)`);
