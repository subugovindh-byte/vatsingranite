# Vatsin Granite ERP — Complete Flow Wireframes

> ASCII wireframes for every module. Arrows show data flow. `[btn]` = button. `▣` = tab.

---

## 1. Authentication

```
┌─────────────────────────────────┐
│       ⛏  AB GRANITE ERP         │
│  Integrated Quarry Management   │
│  Chendrapalli · Krishnagiri     │
├─────────────────────────────────┤
│  Username  [__________________] │
│  Password  [__________________] │
│           [   Sign In   ]       │
│                                 │
│       Forgot password?          │
└─────────────────────────────────┘
         │               │
   Successful        Forgot link
         │               │
         ▼               ▼
   /dashboard    ┌─────────────────┐
                 │ Username        │
                 │ [_____________] │
                 │ [Request Code]  │
                 │ Back to sign in │
                 └────────┬────────┘
                          │ Submit
                          ▼
                 ┌─────────────────┐
                 │ 📬 Code generated│
                 │ Contact admin   │
                 │ [I have a code] │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Reset Code [__] │  ← 6-char hex
                 │ New Password    │
                 │ Confirm         │
                 │ [Update Passwd] │
                 └─────────────────┘
```

**Backend**: `POST /api/auth/forgot-password` → logs token to server stdout (admin retrieves)  
**Backend**: `POST /api/auth/reset-password` → validates token (1hr TTL), bcrypt hash update

---

## 2. Daily Ops — Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                 Vatsin Granite Quarry · FY 25-26 │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Today's  │ Blocks   │ Dispatch │ Revenue  │ Compliance  │
│ Blasts   │ Stock    │ (CBM)    │ MTD      │ Alerts      │
│  [n]     │  [n CBM] │  [n]     │ [₹n]     │  [n]        │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│  ■ Production chart (last 30 days, CBM per day)         │
│  ■ Revenue vs Budget bar                                │
│  ■ Top customers this month                             │
│  ■ Pending items: royalty due · permits expiring        │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Quarry → Block → Weighbridge (Core Ops Flow)

```
QUARRY MASTER               PRODUCTION LOG             BLOCKS
─────────────               ──────────────             ──────
/quarries                   /production                /blocks
[+ Quarry]                  [+ Log Entry]              [+ Block]
                                                              │
Name, ML No.         Quarry, Date, Shift         Block No., Quarry
Area (ha), GPS       Blocks Produced             L×W×H (mm), CBM
GPS Coords           Gross / Net CBM             Grade (A/B/C)
Status               Shift Type, Notes           Weight (kg)
[Photos ↗]           Blasting reference          Status: available
                                                  │        │
                                                  │        └─→ [Photos ↗]
                                                  │
                                                  ▼
                                         WEIGHBRIDGE /weighbridge
                                         ─────────────────────────
                                         Block No., Truck No.
                                         Gross / Tare / Net
                                         Customer, Date
                                         [Print Weigh Slip]

Flow: Quarry is extracted → Production log records daily output →
      Individual blocks created → Weighed at weighbridge before dispatch
```

---

## 4. Trade Flow — Domestic Sales (Full Document Trail)

```
SALES PAGE /sales
═══════════════════════════════════════════════════════
▣ Sales Orders  |  ▣ Customers

Sales Orders Table:
SO No. | Date | Customer | Blocks | CBM | Value | Advance | Status | Actions
       |      |          |        |     |       |         |        | [🖨 Receipt] [→ Invoice] [Edit]

[🖨 Receipt] ──────────────────────────────────────────────→ PRINT
             ┌──────────────────────────────────────────┐
             │          AB GRANITE                      │
             │  Sale Receipt / Delivery Challan         │
             │  Bill To: [Customer]  |  SO/Date/Type    │
             │  ─────────────────────────────────────── │
             │  Description | HSN | CBM | Rate | Value  │
             │  ─────────────────────────────────────── │
             │  Taxable / CGST / SGST (or IGST)         │
             │  Total ← GST 5% HSN 2516                 │
             │  Advance / Balance Due                   │
             │  [PAID stamp if balance=0]               │
             │  Bank Details | For AB GRANITE Signature │
             └──────────────────────────────────────────┘

[→ Invoice] ──→ marks SO status="invoiced" → navigates to /invoices

═══════════════════════════════════════════════════════
INVOICES PAGE /invoices
═══════════════════════════════════════════════════════
▣ ALL  |  ▣ DRAFT  |  ▣ POSTED

Invoice Register:
Inv No. | Date | Customer | SO Ref | Taxable | GST | Total | IRN | EWB | Status | Actions
        |      |          |        |         |     |       |     |     |        | [🖨 Print] [Post→GL] [Edit]

[🖨 Print] ─────────────────────────────────────────────→ PRINT
           ┌──────────────────────────────────────────────┐
           │  AB GRANITE          GSTIN: 33AABCA1234B1Z5  │
           │           TAX INVOICE                        │
           │  Bill To: [Customer]  |  Inv No / Date       │
           │  GSTIN / State        |  SO Ref / PoS        │
           │  ────────────────────────────────────────    │
           │  # | Description | HSN | Taxable | GST | Amt │
           │  1 | Granite Blocks | 2516 | ...             │
           │  ────────────────────────────────────────    │
           │  Taxable / CGST+SGST (or IGST) / Total       │
           │  Amount in Words: Rupees ... Only             │
           │  IRN: ... | EWB: ...                         │
           │  Bank Details | For AB GRANITE Signature     │
           └──────────────────────────────────────────────┘

[Post→GL] ─→ status="posted" + toast shows auto journal entry:
            "Dr. Customer A/R ₹n | Cr. Sales ₹n + CGST/SGST ₹n"

═══════════════════════════════════════════════════════
ACCOUNTS PAGE /accounts
═══════════════════════════════════════════════════════
▣ Vouchers  |  ▣ P&L View  |  ▣ Trial Balance

Vouchers Table:
Vno | Date | Type | Narration | Quarry | Dr(₹) | Cr(₹) | Status | Actions
    |      |      |           |        |       |       |        | [🖨] [Edit] [Del]

[🖨] → Print Voucher (A5 landscape)
      ┌────────────────────────────────────────┐
      │  AB GRANITE    Voucher No: JNL-2526-001│
      │       SALES VOUCHER                    │
      │  Date: 03 May 2026 | Quarry: Vatsin Granite│
      │  Narration: Invoice ABG/INV/2526/001...│
      │  Dr: ₹823,200  Cr: ₹823,200            │
      │  Prepared: ____  Checked: ____  Auth:_ │
      └────────────────────────────────────────┘

[🖨 P&L] → Print P&L Statement (A4)
      Head | This Month | YTD | Budget | Variance
```

**Document sequence per sale:**
```
Weighbridge slip → Delivery Challan (gate) → Tax Invoice (within 30 days) → GL Voucher (on post)
```

---

## 5. Trade Flow — Export Sales

```
EXPORT SALES PAGE /export
═══════════════════════════════════════════════════════
▣ Export Orders  |  ▣ EDPMS / FIRC  |  ▣ Buyers

Export Orders:
SO | Date | Buyer | Country | Blocks | CBM | USD | INR | B/L | SB | EDPMS | RoDTEP | Actions
   |      |       |         |        |     |     |     |     |    |       |        | [🖨 Invoice] [📦 Pack List] [Edit]

[🖨 Invoice] ──────────────────────────────────────────────→ PRINT
             ┌──────────────────────────────────────────┐
             │  AB GRANITE   IEC: AABCA1234B             │
             │         COMMERCIAL INVOICE                │
             │  Buyer: [Name / Country]                  │
             │  Inv No | Date | SB No | B/L Date         │
             │  ─────────────────────────────────────    │
             │  # | Desc | HS 2516.12 | Blocks | CBM     │
             │    | Granite Blocks       | n    | n.nnn  │
             │    | Rate USD/CBM         |      | $n/CBM │
             │  ─────────────────────────────────────    │
             │  FOB: USD n,nnn  (INR ₹n at ₹83.6)        │
             │  Export under LUT — Zero-rated GST        │
             │  SWIFT: HDFCINBBXXX  Bank Details         │
             │  For AB GRANITE  |  Authorised Signatory  │
             └──────────────────────────────────────────┘

[📦 Pack List] ────────────────────────────────────────────→ PRINT
              ┌──────────────────────────────────────────┐
              │  AB GRANITE           PACKING LIST       │
              │  EXP-2026-001 | Buyer | Destination      │
              │  ─────────────────────────────────────   │
              │  Sl | Block No | Colour | L×W×H | CBM    │
              │   1 | ABG/2026/00020 | Paradiso | ...    │
              │  ─────────────────────────────────────   │
              │  Total: n blocks | n.nnn CBM | nnn kg    │
              └──────────────────────────────────────────┘

EDPMS Tab:
SO | Buyer | USD | B/L Date | Due (9mo) | Status | FIRC
   |       |     |          |           | open / realised | pending / received
```

**Export compliance chain:**
```
Export Order → Shipping Bill (Customs) → B/L (Shipping Line)
→ EDPMS entry (RBI within 15 days of shipment)
→ Payment realisation (within 9 months)
→ FIRC / BRC from bank
→ RoDTEP scrip (@ 0.5% of FOB)
```

---

## 6. Finance — Banking & Reconciliation

```
BANKING PAGE /banking
═══════════════════════════════════════════════════════
▣ Transactions  |  ▣ Reconciliation  |  ▣ Facilities

Transactions:
Date | Ref | Narration | Dr(₹) | Cr(₹) | Balance | Type | Reconciled

Recon Tab:
Bank Statement balance | Book balance | Difference
Outstanding cheques | Deposits in transit | [Reconcile]

Facilities:
CC Limit | Utilised | Available | LC Facilities
```

---

## 7. Finance — GST

```
GST PAGE /gst
═══════════════════════════════════════════════════════
▣ GSTR-1  |  ▣ GSTR-3B  |  ▣ ITC  |  ▣ E-Way Bill

GSTR-1 (Outward Supplies):
Invoice | Customer GSTIN | Taxable | CGST | SGST | IGST | HSN
← auto-populated from posted invoices

GSTR-3B Summary:
Outward supplies | ITC available | Net GST payable
[File Return]

ITC Tracker:
Supplier invoice | GSTIN | ITC claimed | 2A match
```

---

## 8. Finance — Royalty (TNMMCR)

```
ROYALTY PAGE /royalty
═══════════════════════════════════════════════════════
▣ Register  |  ▣ Challans  |  ▣ DMF/NMET  |  ▣ Returns

Register:
Period | Quarry | Qty(m³) | Rate | Royalty | DMF(10%) | NMET(2%) | Total | Status | Challan

Challans:
Challan No | Date | Period | Bank | UTR | Amount | Actions
                                                  [🖨] [Edit]

[🖨 Challan] ──────────────────────────────────────────────→ PRINT (A5)
             ┌──────────────────────────────┐
             │  ROYALTY PAYMENT CHALLAN     │
             │  TNMMCR · Vatsin Granite         │
             │  Challan: TNMM/2026/04/0041  │
             │  Period: Apr 2026            │
             │  UTR: SBINXXXX1234           │
             │  Amount: ₹42,452  [PAID]     │
             └──────────────────────────────┘

Calculation flow:
Qty m³ extracted (from Production logs)
  × ₹92/m³ (TNMMCR granite rate)
  = Royalty
  + 10% DMF (District Mineral Foundation)
  + 2% NMET (National Mineral Exploration Trust)
  = Total payable (by 7th of following month)
```

---

## 9. Statutory — Compliance (IBM / MCDR)

```
COMPLIANCE PAGE /compliance
═══════════════════════════════════════════════════════
▣ Mining Plan  |  ▣ Environment  |  ▣ Form-H (IBM)  |  ▣ Demo

Form-H Tab:
Month picker: [May 2026 ▼]  [⬇ Form-H (IBM)]

Preview table:
Quarry | Opening Stock | Extracted | Dispatched | Closing Stock

[⬇ Form-H] → PRINT (A4)
┌───────────────────────────────────────────────────────┐
│     MONTHLY MINERAL RETURN — FORM H                   │
│  [Rule 45 of MCDR 2017 — IBM]                         │
│  Period: May 2026 | Org: Vatsin Granite Quarry            │
│  Mineral: Granite (HSN 2516) | State: Tamil Nadu      │
│  ─────────────────────────────────────────────────    │
│  Quarry | Opening | Extracted | Dispatched | Closing  │
│  ABG    |  nnn    |   nnn     |    nnn     |  nnn CBM │
│  ─────────────────────────────────────────────────    │
│  Total  |  nnn    |   nnn     |    nnn     |  nnn CBM │
│                                                       │
│  Submitted to: IBM Bengaluru Regional Office          │
└───────────────────────────────────────────────────────┘

Data sources: Production logs (extracted CBM) + Sales (dispatched CBM)
```

---

## 10. Statutory — Safety (DGMS)

```
SAFETY PAGE /safety
═══════════════════════════════════════════════════════
▣ Incidents  |  ▣ Inspections  |  ▣ Toolbox Talks  |  ▣ PPE

Incidents:
INC No | Date | Type | Location | Injured | DGMS Reported | Status
       |      | near_miss / first_aid / LTI | | | [true/false] |

Incident types (DGMS classification):
  near_miss → log only
  first_aid → record, no DGMS report
  LTI       → DGMS report mandatory within 24hrs (Form 15)
```

---

## 11. Statutory — Permits

```
PERMITS PAGE /permits
═══════════════════════════════════════════════════════
Permit | Type | Authority | Reference | Valid Till | Alert | Status | Actions

Types tracked:
  ML    → Mining Lease (DGM, 20-yr)
  EC    → Environmental Clearance (MoEF/SEIAA)
  TNPCB → Consent to Operate
  PESO  → Explosives Magazine Licence
  MDP   → Mining Development Plan (IBM)
  WP    → Water (bore well) Permit

Alert engine: renewal_lead_months before valid_till → red badge
```

---

## 12. Equipment — Assets & Maintenance

```
ASSETS PAGE /assets        MAINTENANCE PAGE /maintenance
═══════════════            ══════════════════════════════
Asset Register:            Jobs:
Asset No | Name | Type     Job No | Asset | Type | Date
Purchased | Value | Hours  | Est Cost | Actual | Status
Status: active/idle/       [+ New Job]
        maintenance
```

---

## 13. HR — Employees & Payroll

```
EMPLOYEES PAGE /employees  PAYROLL PAGE /payroll
══════════════════════════ ══════════════════════════════
EMP ID | Name | Dept       Name | Days | Gross | EPF | ESI
ESIC | UAN | PAN           PT | TDS | Net | Actions
Bank Details               [🖨 Payslip] per row
[+ Employee]
                           [🖨 Payslip] → PRINT (monospace, A5)
                           Vatsin Granite Quarry · EMP-ID · Name · Dept
                           Days Worked / Basic / HRA / Gross
                           EPF 12% / ESI 0.75% / PT / TDS
                           NET PAY: ₹n
```

---

## 14. System — Users & Masters

```
USERS PAGE /users
══════════════════════════
Name | Email | Role | Quarries | Last Login | Status
[+ User]  Roles: admin / supervisor / accounts / compliance / viewer
Quarry-level access control

MASTERS PAGE /masters
══════════════════════════
▣ Varieties  |  ▣ Cost Centres  |  ▣ Tax Rates  |  ▣ Units

Varieties: Code | Name | Colour | Finish | HSN | GST% | Quarry
```

---

## 15. Complete Data Flow Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │              QUARRY OPERATIONS              │
                    │  Blasting → Production → Block → Weighbridge│
                    └──────────────────┬──────────────────────────┘
                                       │ qty extracted (CBM / m³)
               ┌───────────────────────┼──────────────────────────┐
               ▼                       ▼                          ▼
        ┌──────────┐          ┌──────────────┐           ┌────────────────┐
        │  ROYALTY │          │    SALES     │           │  FORM-H (IBM)  │
        │  ₹92/m³  │          │  SO → Challan│           │  Monthly return│
        │  DMF 10% │          │  → Invoice   │           │  to IBM Bengaluru│
        │  NMET 2% │          │  → GL Voucher│           └────────────────┘
        └──────────┘          └──────┬───────┘
                                     │ posted invoices
                                     ▼
                             ┌──────────────┐
                             │   ACCOUNTS   │
                             │  GL Vouchers │
                             │  P&L / TB   │
                             │  Bank Recon │
                             └──────┬───────┘
                                    │
                              ┌─────┴──────┐
                              ▼            ▼
                          ┌──────┐   ┌──────────┐
                          │  GST │   │  REPORTS │
                          │ 3B/R1│   │ DPR/P&L  │
                          └──────┘   └──────────┘

EXPORT SALES (parallel track):
  Export Order → Commercial Invoice + Packing List
  → Shipping Bill → EDPMS → FIRC → RoDTEP
```

---

## 16. Printable Document Summary

| Document | Module | Format | Purpose |
|---|---|---|---|
| Delivery Challan | Sales → 🖨 Receipt | A4 | Gate document, customer copy at dispatch |
| Tax Invoice (GST) | Invoices → 🖨 Print | A4 | Statutory GST invoice, within 30 days of supply |
| Commercial Invoice | Export → 🖨 Invoice | A4 | Customs, bank, buyer — USD denominated, zero-rated |
| Packing List | Export → 📦 Pack List | A4 | Customs, shipping agent, container stuffing |
| Journal Voucher | Accounts → 🖨 | A5 landscape | Internal audit, 3-signature approval |
| P&L Statement | Accounts → 🖨 P&L | A4 | Management review, auditor |
| Royalty Challan | Royalty → 🖨 | A5 | TNMMCR compliance proof of payment |
| Form-H (IBM) | Compliance → ⬇ | A4 | Monthly IBM filing (MCDR Rule 45) |
| Payslip | Payroll → 🖨 | A5 | Employee, EPF/ESI compliance |
| Block Sticker | Blocks → Print | Label | Block identification, quarry code |

---

## 17. Missing / Roadmap Items

| Item | Priority | Notes |
|---|---|---|
| GSTR-1 / GSTR-3B auto-population from invoices | High | GST portal upload |
| Bank Reconciliation matching | High | Auto-match bank CSV to GL |
| Trial Balance auto-generation | High | From posted GL vouchers |
| E-Invoice IRN generation | High | IRP API integration |
| E-Way Bill auto-generation | High | NIC API integration |
| Weighbridge slip print | Medium | Gate copy |
| Payment receipt (money receipt) | Medium | When customer pays |
| Balance Sheet | Medium | Assets / Liabilities |
| Email notifications | Medium | Invoice + payslip delivery |
| EDPMS export to RBI format | Medium | Authorised Dealer bank |
| Mobile camera capture for blocks | Low | GPS-tagged photos |
