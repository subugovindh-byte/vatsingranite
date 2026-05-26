# Software Solution Specification

## Integrated Quarry Management & ERP Platform
### Vatsin Granite Quarry  |  Paradiso Multi-Colour Granite Division

| | |
|---|---|
| **Prepared for** | Vatsin Granite Quarry Pvt. Ltd. — Tamil Nadu, India |
| **Document Version** | 1.1 (with Gap-Closure Addendum) |
| **Date** | 23 May 2026 |
| **Classification** | Confidential |

---

## Document Control

### Revision History

| Version | Date | Author | Change Summary |
|---|---|---|---|
| 0.1 | 10-May-2026 | Solution Architect | Initial outline and module map |
| 0.5 | 17-May-2026 | Solution Architect | Added compliance, GST, e-way bill, payroll detail |
| 1.0 | 23-May-2026 | Solution Architect | Baselined for stakeholder/vendor review |
| 1.1 | 23-May-2026 | Solution Architect | Gap-closure addendum: M23–M30 new modules + 10 cross-cutting refinements |

### Stakeholders

| Role | Responsibility | Sign-off |
|---|---|---|
| Managing Director, Vatsin Granite | Business approval, budget, strategic priorities | Yes |
| Quarry Manager (AB & Paradiso) | Operational requirements, blasting plans, dispatch | Yes |
| Finance & Accounts Head | Accounting, GST, banking, audit | Yes |
| HR / Payroll Lead | Employee, attendance, PF/ESI compliance | Yes |
| Statutory / Compliance Officer | Mines, IBM returns, royalty, environmental | Yes |
| IT / Solution Architect | System design, integrations, security | Yes |
| Mines Department (TN), IBM, GST officer | External regulator interface | Notified |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Background](#2-business-background)
3. [System Overview](#3-system-overview)
4. [Functional Modules — Detailed Specification](#4-functional-modules--detailed-specification)
5. [Regulatory Compliance — Detailed Mapping](#5-regulatory-compliance--detailed-mapping)
6. [Core Data Model](#6-core-data-model-indicative)
7. [Integrations](#7-integrations)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Roles & Access Control](#9-roles--access-control)
10. [Reports & Statutory Outputs](#10-reports--statutory-outputs)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Key Risks & Mitigation](#12-key-risks--mitigation)
13. [Indicative Cost & Effort](#13-indicative-cost--effort-order-of-magnitude)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Glossary](#15-glossary)
16. [Gap Analysis & Refinements (v1.1 Addendum)](#16-gap-analysis--refinements-v11-addendum)
17. [Document Sign-off](#17-document-sign-off)

---

## 1. Executive Summary

Vatsin Granite Quarry Pvt. Ltd. operates two principal quarry sites in Tamil Nadu: the flagship **Vatsin Granite** hard-rock quarry, and the **Paradiso multi-colour granite division** which extracts the premium Paradiso Classico and Paradiso Bash variants for export-grade block sales. Current operations rely on a combination of paper registers, disparate Excel workbooks, a basic Tally instance for accounts, and manual filing of statutory returns. This fragmented landscape exposes the company to revenue leakage, royalty disputes with the Department of Geology and Mining, delayed GSTR filings, e-way bill rejections at check-posts, audit observations on safety records under the Mines Act 1952, and missed maintenance windows on high-value mining equipment.

This specification defines an **Integrated Quarry Management & ERP Platform** that consolidates every operational, financial and statutory workflow for both quarries into a single web-based, mobile-enabled system. The platform covers production capture (drilling, blasting, block extraction by cubic metre), stockyard and dispatch, local and export sales with e-way bill and shipping bill generation, double-entry accounting, GST (CGST/SGST/IGST) with HSN 2516 reporting, employee master with statutory payroll (EPF, ESI, professional tax, bonus, gratuity), machinery and equipment lifecycle with preventive maintenance scheduling, bank reconciliation and loan/EMI tracking, royalty/seigniorage calculation per cubic metre with auto-generation of mineral despatch permits, environmental and DGMS safety registers, IBM monthly and annual returns (MCDR), and management dashboards.

The platform is fully aligned with the current **Tamil Nadu Minor Mineral Concession Rules 1959** (as amended), the **Mines and Minerals (Development and Regulation) Act 1957**, the **Mines Act 1952 and Mines Rules 1955**, the **CGST Act 2017 and Tamil Nadu GST Act 2017**, the **Indian Bureau of Mines (MCDR) Rules 2017**, the **Income-tax Act 1961**, the **Code on Wages 2019**, and applicable environmental legislation administered by the Tamil Nadu Pollution Control Board and MoEFCC.

### 1.1 Business Objectives

- Eliminate manual cubic-metre reconciliation between production, despatch, royalty and sales.
- Generate every statutory return (GSTR-1, GSTR-3B, GSTR-9, MCDR Form F1/F2/H1, monthly royalty return, IBM annual return) directly from system data with zero re-keying.
- Achieve zero check-post rejections by integrating e-way bill (NIC) generation at the point of despatch.
- Bring preventive maintenance compliance for excavators, drills, compressors, wire saws and dumpers to >95% on-time completion.
- Provide the Managing Director with a real-time, single-screen view of production (m³), sales (₹), receivables, royalty payable, and safety incidents across both quarries.
- Strengthen export readiness for Paradiso division: containerised block sales with shipping bill, BL, GR/EDPMS reconciliation, and DGFT export-incentive tracking.

### 1.2 Project Scope at a Glance

| Area | In Scope | Out of Scope (Phase 1) |
|---|---|---|
| Sites | Vatsin Granite quarry, Paradiso multi-colour quarry, head office, stockyard, weighbridge | Trading depots outside Tamil Nadu |
| Users | ~25 office users + 60 operational/field users | Public customer portal |
| Functions | Operations, sales (local + export), accounts, GST, payroll, machinery, compliance, banking, MIS | Manufacturing of finished slabs (separate plant) |
| Languages | English (primary), Tamil (UI labels for field roles) | Hindi |
| Devices | Web (Chrome/Edge), Android tablets/phones for field, ruggedised handheld for weighbridge | iOS native app |

---

## 2. Business Background

### 2.1 About Vatsin Granite Quarry

**Applicant:** M/s Vatsin Granite
**Address:** 223/1A, Chendrapalli Village, Anchur Post, Bargur Taluk, Krishnagiri – 635 203, Tamil Nadu, India

Vatsin Granite holds a quarry lease for the colour-grade granite-bearing area at Chendrapalli Village (Bargur Taluk, Krishnagiri District) under the **Tamil Nadu Minor Mineral Concession Rules 1959**. The lease covers **two adjoining cadastral parcels** with a combined extent of **1.80 Ha**, of which **1.33.44 Ha is mineable area** and **0.46.56 Ha is statutory safety distance** (boundary buffer, road / habitation set-backs).

| Lease Attribute | Value |
|---|---|
| Survey Field Numbers (SF Nos) | 223/1A1(P) — 1.38 Ha and 224/2A(P) — 0.42 Ha |
| Total lease extent | 1.80 Ha (4.45 acres) |
| Mineable area | 1.33.44 Ha |
| Safety area (boundary buffer) | 0.46.56 Ha |
| Village / Taluk / District / State | Chendrapalli / Bargur / Krishnagiri / Tamil Nadu |
| Approx. centroid (from boundary co-ordinates) | ~12°26′ N, 78°17′ E |
| Boundary survey | 15-point GPS demarcation (see Appendix A) |
| Mineral | Granite (multi-coloured — Brown / Grey & White as evidenced by core bore study) |
| Mining method | Opencast bench mining, controlled blasting, hydraulic excavators, primary dressing, fenced stockyard despatch |

Because the lease spans **two SF Nos**, the system's **Lease Master** must support multi-parcel leases with per-parcel area, FMB (Field Measurement Book) sketch reference, patta linkage, and per-parcel encroachment / boundary-dispute tracking. The platform stores the **15-point GPS polygon** as the legal boundary; every blast and block geo-tag is validated against this polygon (lease-polygon validation under module M23).

The Bargur–Krishnagiri belt is a well-known source of **multi-coloured granite** with commercial colour variants observed at the site itself (see Appendix A core bore reports — Brown in the north and centre, Grey & White in the south), making this lease commercially compatible with the company's **Paradiso multi-colour** product line.

### 2.2 About the Paradiso Multi-Colour Quarry

The Paradiso division extracts the highly sought-after **Paradiso** (also marketed as Paradiso Classico, Paradiso Bash and Paradiso Gold) granite — a multi-coloured migmatitic gneiss prized in export markets, principally China, Italy, the United States, Vietnam and the Gulf. Block sales are predominantly export-oriented and are sold **by cubic metre**, with grading (Grade A / B / C) influencing realised price per cubic metre. The division requires additional functionality around block-level QR/RFID tagging, photo-evidence galleries per block, surveyor measurement sheets, stuffing reports, and shipping documentation.

### 2.3 Current Pain Points

- Royalty / seigniorage calculation done in Excel, reconciled monthly with the Department of Geology and Mining — frequent disputes on cubic-metre figures.
- E-way bills generated manually on the NIC portal causing delays of 30–90 minutes per truck.
- GST returns prepared by external CA from scanned invoices — high error rate, late ITC claims.
- Payroll for 110+ workers (mix of permanent, contract, piece-rate drillers and blasters) handled in Excel; PF/ESI challans filed manually.
- Maintenance schedules for Komatsu/Hitachi excavators, Atlas Copco drills and compressors tracked in workshop notebooks — frequent breakdowns from missed services.
- Safety incident register maintained on paper; difficulty producing data during DGMS inspection.
- No consolidated view across Vatsin Granite and Paradiso for the management.

---

## 3. System Overview

### 3.1 Solution Vision

A single, modular, web-based ERP platform — purpose-built for Indian granite quarries — that **captures every cubic metre from blast face to buyer, posts every rupee into the general ledger automatically, and files every statutory return on time**. Built around an open, API-first architecture so the company can integrate future systems (drone volumetric surveys, IoT on weighbridge, GPS on dumpers, banking APIs) without re-platforming.

### 3.2 High-Level Architecture

| Layer | Description | Indicative Technology |
|---|---|---|
| Presentation | Responsive web UI, Android tablet/mobile app for field, weighbridge kiosk | React / Next.js, React Native, PWA |
| API / Application | Stateless REST + GraphQL services, role-based authorization, business rules | Node.js / NestJS or Java Spring Boot |
| Workflow / BPM | Permits, approvals, sales orders, leave, indents | Camunda or in-app workflow engine |
| Data | Transactional database, document store for scans, data warehouse for MIS | PostgreSQL, MinIO/S3, ClickHouse |
| Integrations | GST (GSP/ASP), NIC e-way bill, NIC e-invoice, banks, IBM, DGFT/ICEGATE, biometric, weighbridge serial | REST/SOAP adapters, SFTP |
| Identity & Security | SSO, MFA, audit log, encryption at rest/in transit | Keycloak / Azure AD, TLS 1.3, AES-256 |
| DevOps | CI/CD, monitoring, backup, DR | GitLab CI, Prometheus/Grafana, daily encrypted off-site backup |

### 3.3 Deployment Model

Recommended deployment is **private cloud (AWS Mumbai or Azure India Central) with a local cache server at each quarry** to allow continued operation during internet outages. All personally identifiable employee data and statutory records remain stored within India, in line with Indian data-residency expectations and the **Digital Personal Data Protection Act 2023**.

### 3.4 Module Map

| # | Module | Primary Users |
|---|---|---|
| M1 | Quarry Operations & Production | Quarry Manager, Mining Engineer, Surveyor, Foreman |
| M2 | Drilling, Blasting & Explosives Magazine | Blaster, Magazine Keeper, Mining Engineer |
| M3 | Block & Stockyard Management (QR/RFID) | Stockyard In-charge, Surveyor |
| M4 | Machinery & Equipment Lifecycle | Workshop Manager, Mechanic, Operator |
| M5 | Preventive & Breakdown Maintenance | Workshop Manager, Mechanic |
| M6 | Procurement, Stores & Inventory | Stores In-charge, Purchase Officer |
| M7 | Sales — Local (Domestic) | Sales Executive, Despatch Clerk |
| M8 | Sales — Export (Paradiso) | Export Manager, CHA Coordinator |
| M9 | Weighbridge & Despatch | Weighbridge Operator, Security |
| M10 | E-Way Bill & E-Invoice | Despatch Clerk, Accountant |
| M11 | Accounting & Finance (General Ledger) | Accountant, Finance Manager |
| M12 | GST, TDS, Income-tax | Accountant, External CA |
| M13 | Banking, Loans & Treasury | Finance Manager, Accountant |
| M14 | Employee Master, Attendance & Payroll | HR Officer, Payroll Clerk |
| M15 | Statutory Compliance — Mining (Mines Act, MMDR, MCDR, Royalty, IBM) | Compliance Officer, Mining Engineer |
| M16 | Statutory Compliance — Labour & Tax (PF, ESI, PT, Bonus, Gratuity, IT) | HR, Accountant |
| M17 | Environmental & Pollution Control (CTE/CTO, TNPCB) | Compliance Officer |
| M18 | Safety, Incident & First-aid Register (DGMS) | Safety Officer, Mines Manager |
| M19 | Permits & Mineral Despatch Permit (per m³) | Compliance Officer, Despatch |
| M20 | Document Management & Audit Vault | All |
| M21 | Management Dashboards & MIS | MD, CFO, Quarry GM |
| M22 | Mobile App (field capture) | Foreman, Operator, Driver |

---

## 4. Functional Modules — Detailed Specification

### 4.1 M1 — Quarry Operations & Production

Captures the day-to-day production cycle in volumetric (cubic metre) terms, the primary unit of measure for granite. Maintains masters for quarry, bench, pit, block, grade and colour.

**Key Capabilities**
- Bench / pit / face master with lease-area mapping and geo-coordinates.
- Daily production log: drilling metres, blast count, blocks recovered (L × B × H in metres → cubic metres), grade, colour, in-charge.
- Surveyor measurement sheet — three-dimensional measurement with auto-calculation of gross and net cubic metres after dressing allowance.
- Photo capture of every block (front + side) with geo-tag and time-stamp.
- Auto-numbering of blocks (e.g., `ABG/2026/00451`, `PARA/2026/00128`) and printing of QR/RFID tag for stockyard.
- Linkage of every cubic metre extracted to the lease's permitted annual quantity — automatic alert when 80%, 90%, 100% of the gazetted limit is approached.
- Daily/weekly/monthly production reports per quarry, per bench, per grade, per colour.

**Key Reports**
- Daily Production Statement (DPR)
- Bench-wise extraction (m³)
- Recovery % (blocks recovered / blast yield)
- Lease balance — permitted vs. extracted (m³, %)

### 4.2 M2 — Drilling, Blasting & Explosives Magazine

Manages controlled blasting operations and the magazine licence under the **Explosives Rules 2008** and the **Mines Act 1952**.

- Blasting pattern: hole diameter, depth, spacing, burden, sub-grade drilling, total drilled metres.
- Explosives consumption: emulsion, ANFO, detonators, detonating cord, shock-tube — issued from magazine against blast indent and reconciled day-end.
- **Explosives Magazine Register** (mandatory under PESO licence): opening stock, receipt with consignment note, issued for blast, returned unused, closing stock — daily.
- Blast report: signed by the blaster (with statutory blaster certificate number), shotfirer, mines manager; recorded misfires.
- Reconciliation: explosives consumed (kg) vs. rock blasted (tonnes / m³) — efficiency analytics.
- Alerts before PESO licence expiry; auto-renewal task list.

### 4.3 M3 — Block & Stockyard Management

- Block master: number, quarry, bench, blast date, dimensions, gross m³, net m³, gross tonnes (default density 2.7 t/m³, overridable per variant), grade, colour, photo, current location, status (in stockyard / committed / despatched / rejected).
- **QR / RFID tag** — printed from system, scannable on the mobile app for instant block lookup.
- Stockyard map view; FIFO suggestion for loading; ageing of blocks (> 60 / 90 / 180 days).
- Block reservation / hold for a sales order; prevents double-allocation.
- Block grading reassessment workflow with audit trail.
- Inter-stockyard transfer (with internal delivery challan and e-way bill where threshold applies).

### 4.4 M4 — Machinery & Equipment Lifecycle

Single source of truth for every powered asset: hydraulic excavators (Komatsu PC200/300, Hitachi ZX, etc.), wheel loaders, dumpers/tippers, crawler drills (Atlas Copco, Furukawa), compressors, wire saws, jet burners, dewatering pumps, DG sets, mobile cranes.

- Asset register: make, model, year, chassis/engine serial, RC, insurance, PUC, fitness certificate, capitalised cost, depreciation method, current book value.
- Hour-meter / kilometre log captured daily by the operator on mobile.
- Fuel issue voucher (HSD) per asset; mileage analytics.
- Insurance, fitness (RTO), PUC and statutory inspection due-date alerts (45/30/15/0 days).
- Operator assignment with valid driving / heavy-equipment licence cross-check.
- Hire-in / hire-out machinery register (rate per hour / per shift).

### 4.5 M5 — Preventive & Breakdown Maintenance

- Preventive maintenance (PM) schedule **by hour-meter and by calendar** (daily, weekly, 250 / 500 / 1000 / 2000 hour services).
- Job card for breakdown: symptom, cause, action, spares used, downtime hours.
- Spares consumption linked to stores (M6) with auto-issue.
- **Monthly and yearly maintenance scorecard** per asset: PM compliance %, MTBF, MTTR, total downtime, cost of maintenance.
- Annual fitness inspection planner; integration with statutory inspection under the Mines Act.
- Warranty tracking and OEM service contract (AMC) renewal alerts.

### 4.6 M6 — Procurement, Stores & Inventory

- Item master with HSN code, unit of measure, reorder level, safety stock, lead time.
- **Indent → RFQ → Purchase order → Goods receipt note → Quality check → Stores → Bill passing** — full P2P cycle.
- Vendor master with GSTIN, PAN, MSME registration, bank details, TDS section, payment terms.
- Stores: bin location, batch, FIFO/weighted-average costing.
- Two- and three-way matching of PO, GRN and vendor invoice before payment.

#### 4.6.1 Consumables — Monthly / Batch-wise Procurement & Tracking

A dedicated consumables sub-module tracks the high-volume, recurring inputs that drive variable cost per cubic metre. Each consumable type has its own procurement cadence (monthly indent, batch order, or event-triggered re-order), its own consumption capture point, and its own KPI on cost-per-m³.

| Consumable | Procurement Cadence | Captured Against | Primary KPI |
|---|---|---|---|
| **Electricity (TANGEDCO grid + DG backup)** | Monthly bill (MD/non-MD), with daily KWh reading | Quarry / bench / compressor / pump-house | KWh per m³ produced; ₹ per m³ |
| **HSD diesel (bulk + retail)** | Weekly bulk indent from oil company + monthly reconciliation | Asset-wise fuel voucher (excavator, dumper, drill, compressor, DG) | Litres per hour-meter; ₹ per m³ moved |
| **Lubricants & hydraulic oil** | Monthly batch indent | Asset / PM service | Litres per machine hour |
| **Machinery spare parts** (filters, hoses, undercarriage, bucket teeth, pins, bushes) | Monthly indent + emergency batch | Asset job-card | Spare cost per asset per month |
| **Diamond wire rope (wire saw)** | Batch-wise per coil (e.g. 40 m coils, 8.5–11.5 mm) | Wire-saw machine + block being cut | Metres cut per coil; ₹ per m² of sawn surface |
| **Diamond cutting blades / segments** (circular saw, chain saw) | Batch-wise per blade / per segment set | Cutting machine + block / job | m² cut per blade; ₹ per m² |
| **Drill bits, button bits, rods, shanks, couplings** | Monthly indent + bench-wise issue | Drill machine + bench | Drilled metres per bit |
| **Explosives & accessories** | Weekly indent from licensed magazine | Blast-event | Kg per m³ rock broken |
| **Compressor consumables** (air filters, separator, compressor oil) | Per service interval (hours) | Compressor asset | Cost per air-hour |
| **PPE & general consumables** | Monthly issue from stores | Employee | Issue compliance % |
| **Welding electrodes, gas, workshop consumables** | Monthly indent | Workshop | Spend per repair job |
| **Tyres (dumpers, loaders)** | Batch on threshold (worn / damaged) | Asset wheel position | Kilometres / hours per tyre |

**Capabilities**
- **Monthly Consumption Plan (MCP)**: at the start of each month, the system proposes a consolidated indent for every consumable based on (a) prior 3-month moving average, (b) planned production (m³) for the next month, and (c) current stock vs reorder level. Quarry GM approves and the system fires RFQs / blanket POs.
- **Batch-wise tracking for diamond wire rope & blades**: each coil / blade receives a unique serial. Issue is logged against the wire-saw or cutting machine, and the **operator records cumulative cut surface (m²) and runtime hours** at end of shift. The coil/blade is marked "exhausted" when it fails or drops below threshold cutting rate. The system reports **m² cut per coil**, **₹ per m² of sawn block**, and identifies under-performing brands / batches.
- **Electricity sub-module**: daily KWh reading per feeder (main quarry, compressor house, dewatering pumps, office, colony); monthly TANGEDCO bill capture with break-up (energy, demand charge, penalty, electricity tax, FAC); auto cost-allocation to cost-centres. DG set fuel + KWh produced for backup-power cost.
- **Fuel sub-module**: indent from petroleum company (HSD bulk), tank receipt with dip reading, daily tank dip, asset-wise fuel issue voucher (against hour-meter reading), monthly reconciliation of (opening + receipt − issue − closing dip), variance investigation, mileage / fuel-per-hour analytics per asset.
- **Vendor performance** tracked per consumable category: on-time delivery, price trend, quality rejection %, payment terms adherence.
- **Cost per cubic metre** dashboard rolls up: Electricity + Fuel + Lubricants + Diamond rope + Blades + Drill consumables + Explosives + Spares = **variable consumable cost / m³** per quarry per month.
- **Alerts**: stock below reorder; coil/blade approaching end-of-life; fuel tank below 20%; monthly electricity bill not received by 5th; vendor rate revision letter not actioned.
- **Audit-ready registers**: fuel register (per Mines Rules), diesel-tank register, electricity meter register, diamond-tool issue register, scrap / worn-out tool disposal register.

**Reports**
- Monthly consumable consumption summary (per quarry, per consumable, ₹ and qty)
- Diamond wire rope performance — coil-wise m² and ₹/m²
- Blade / segment performance log
- Fuel reconciliation statement and asset mileage
- Electricity bill register and KWh/m³ trend
- Spares cost per asset (top-20 cost consumers)
- Vendor scorecard for consumable suppliers

### 4.7 M7 — Sales (Local / Domestic)

Handles domestic block, rough-block and aggregate sales within Tamil Nadu and to other Indian states.

- Customer master: GSTIN, state, place of supply (for CGST+SGST vs IGST determination), credit limit, payment terms.
- Quotation → Sales order (with block reservation) → Proforma invoice → Tax invoice.
- Price list by grade / colour / size band; discount approval workflow.
- Advance receipt with auto-generation of advance receipt voucher and ITC adjustment on final invoice.
- Customer-wise outstanding, ageing, dunning.
- Reverse-charge applicability flag for unregistered customers.

### 4.8 M8 — Sales (Export, Paradiso)

Block export workflow tailored for granite, with all documents required under the **Foreign Trade Policy 2023** and **Customs Act 1962**.

- Buyer / consignee master with overseas address, IEC, country, INCOTERMS, port of discharge.
- Export sales order with packing list at block level (block-no, dimensions, m³, weight).
- Stuffing / loading photographs and surveyor stuffing report uploaded against the order.
- Documents generated: commercial invoice, packing list, certificate of origin (CoO via DGFT eCoO), pre-shipment inspection report, shipping bill data file for CHA, bill of lading capture, post-shipment documents.
- **ICEGATE shipping-bill reference** and **EDPMS realisation** tracking with AD-Code bank.
- DGFT incentive tracker (**RoDTEP** scrip) per shipping bill.
- Foreign-exchange invoice (USD/EUR) with INR conversion at customs notified rate; differential booking on realisation.
- **Letter of Undertaking (LUT)** management for export without IGST payment; renewal alerts each financial year.

### 4.9 M9 — Weighbridge & Despatch

- Direct serial / TCP read from electronic weighbridge indicator — eliminates manual entry.
- Two-weighment slip (tare + gross) auto-printed with photograph of vehicle and driver.
- Cross-validation against the despatch advice and sales order (block numbers, expected weight).
- Vehicle in / out gate-pass with timestamp.
- Daily despatch register (m³, MT, ₹) by customer, by destination, by quarry.

### 4.10 M10 — E-Way Bill & E-Invoice

Fully integrated with the **NIC E-Way Bill Portal** (`ewaybillgst.gov.in`) and the **NIC IRP** for e-invoicing under Rule 48(4) of the CGST Rules. Granite (**HSN 2516**) typically attracts 5% GST for crude/roughly trimmed blocks and 18% for sawn / dressed slabs; the rate engine is configurable.

- Single-screen generation of tax invoice + IRN (e-invoice) + e-way bill, with QR code printed on the invoice.
- Auto-calculation of distance from despatch PIN to delivery PIN to set the **e-way bill validity** (1 day per 200 km, with multimodal logic).
- Part-A only generation when transporter is to update vehicle (multi-leg transport).
- Vehicle update, transporter change, cancellation within 24 hours, rejection by recipient — all from within the application.
- Consolidated e-way bill for multiple consignments in the same vehicle.
- Automatic generation when value crosses ₹50,000 (or as notified for intra-state Tamil Nadu).
- Failure / retry queue, NIC error-code dictionary, full audit log of every API call.

### 4.11 M11 — Accounting & Finance (General Ledger)

- Double-entry general ledger with multi-cost-centre (Vatsin Granite, Paradiso, Head Office) and multi-project.
- Configurable chart of accounts pre-loaded with **Indian Schedule III** structure.
- Automatic journal posting from every transactional module (sales, purchase, payroll, payment, receipt, depreciation, royalty).
- Cash, bank, journal, contra and credit/debit note vouchers.
- Bank reconciliation with statement import (MT940, XLS, PDF-parse).
- Period-end close: provisions, accruals, deferred revenue, depreciation run (WDV / SLM as per Income-tax Act / Companies Act).
- Financial statements: Trial Balance, P&L, Balance Sheet, Cash Flow — Schedule III compliant.
- Cost / management accounting: **cost per cubic metre per quarry**, gross margin per grade / colour, EBITDA per division.

### 4.12 M12 — GST, TDS, Income-tax

**Goods & Services Tax**
- HSN master: 2516 (granite blocks/slabs), 6802 (worked monumental stone), 8474 (machinery), etc., with rate history.
- Place-of-supply engine for inter-state vs intra-state (CGST+SGST vs IGST).
- **GSTR-1** (outward), **GSTR-3B** (monthly summary), **GSTR-9** (annual), **GSTR-9C** (reconciliation) generation; direct upload via GSP/ASP.
- ITC ledger: eligible, ineligible (blocked u/s 17(5)), reversed, re-availed — with auto-matching against **GSTR-2B**.
- Reverse-charge management (GTA, advocate, security, etc.).
- E-invoicing (IRN/QR) for B2B above the prevailing turnover threshold.
- LUT for zero-rated exports; refund of accumulated ITC application workings.

**TDS / TCS**
- TDS deduction at source on contractor payments (**194C**), professional fees (**194J**), rent (**194I**), commission (**194H**), interest (**194A**), and TDS on purchase of goods (**194Q**).
- TCS on sale of goods (**206C(1H)**) — applicable on receipts above ₹50 lakh from a buyer.
- Quarterly TDS returns (24Q, 26Q, 27Q, 27EQ) data export, challan 281 generation, Form 16 / 16A printing.

**Income-tax**
- Advance tax computation each quarter; depreciation as per Income-tax Rules; MAT computation; provision for tax.

### 4.13 M13 — Banking, Loans & Treasury

- Multi-bank, multi-account ledger with auto-reconciliation.
- Cheque book series management; **positive pay** file generation for bank upload.
- NEFT/RTGS/IMPS bulk payment file generation in the bank's prescribed format.
- Loan master: term loan, working capital cash credit, equipment finance, vehicle loan — sanction letter, EMI schedule, interest accrual, prepayment, foreclosure.
- Drawing-power computation for cash-credit / stock-statement uploads (monthly **MSOD / QIS** to bank).
- Bank guarantee and letter of credit register; renewal alerts.
- Forex export receipts: AD-bank intimation, **FIRC** capture, **EDPMS** reconciliation.

### 4.13A — Complete Financial Package (Quarry-Specific)

This section consolidates the end-to-end financial package that wraps around the quarry operation. It expands on M11–M13 and ties accounting, costing, working capital, treasury, taxation, insurance, statutory provisioning, and management finance into one operating model purpose-built for a granite quarry that sells by the cubic metre.

#### 4.13A.1 Chart of Accounts — Quarry-Tuned

The pre-loaded chart of accounts follows Indian Schedule III but adds quarry-specific ledgers:

| Group | Sample Ledgers |
|---|---|
| **Direct revenue** | Sales – Domestic Blocks (HSN 2516), Sales – Export Blocks, Sales – Aggregate / Crusher, Sales – Scrap, Sales – Hire (machinery), Forex gain on export realisation |
| **Direct cost of production** | Drilling charges, Blasting & explosives, HSD diesel – production, Electricity – production, Diamond wire rope, Cutting blades & segments, Drill bits & rods, Lubricants & hydraulic oil, Spares – production assets, Contract labour – production, Wages – piece-rate (drillers/blasters/masons), Royalty / seigniorage expense, DMF contribution, NMET contribution, Environmental cess |
| **Indirect production overheads** | Workshop wages, Workshop consumables, Welding & fabrication, Tyres, Insurance – production assets, Depreciation – production assets, Magazine watch & ward, Security – mine area, Mine surveyor fees |
| **Logistics & despatch** | Vehicle hire (outbound), Weighbridge maintenance, Loading charges, Toll, GPS / tracking, Packing & lashing (export) |
| **Selling & admin** | Sales commission, Marketing & samples, CHA charges, Bank charges – export, Foreign bank charges, Office salaries, Statutory audit fees, Internal audit, CA / consultancy |
| **Finance cost** | Interest – term loan, Interest – cash credit, Interest – equipment finance, Interest – vehicle loan, Bank guarantee charges, Letter of credit charges, Forex hedging cost |
| **Statutory provisions** | Provision for gratuity, Provision for leave encashment, Provision for mine closure, Provision for bonus, Provision for taxation, Deferred tax |
| **Balance sheet — assets** | Quarry lease (intangible), Mining development cost, Excavator / Drill / Compressor / Wire-saw / DG asset blocks, Stockyard inventory – blocks, Stores – consumables, Sundry debtors (domestic), Sundry debtors (export), GST input credit, TDS receivable, RoDTEP scrip receivable, FIRC pending |
| **Balance sheet — liabilities** | Equity, Reserves, Long-term loans, Cash credit, Lease liability, Royalty payable, GST payable, TDS payable, PF / ESI / PT payable, Statutory bonus payable, Gratuity provision, Mine closure provision |

#### 4.13A.2 Cost-per-Cubic-Metre Engine

The single most important financial number for a granite quarry. Every cost ledger is tagged to a cost driver and rolled up automatically.

| Cost Bucket | Driver | How it is captured |
|---|---|---|
| Drilling & blasting | Drilled metres, explosives kg | Blast event (M2) |
| Fuel | Litres × rate | Asset-wise fuel voucher (M6.1) |
| Electricity | KWh × rate | Daily meter reading (M6.1) |
| Diamond rope & blades | Coil/blade cost ÷ m² cut | Tool issue log (M6.1) |
| Spares | Job-card cost | Maintenance job (M5) |
| Wages – piece-rate | Per block / per metre | Payroll piece-rate (M14) |
| Royalty / DMF / NMET | ₹ per m³ despatched | Royalty engine (M15) |
| Depreciation | SLM / WDV per period | Fixed asset register (M11) |
| Logistics | Per trip / per MT | Despatch (M9) |
| Allocated overheads | Activity / m³ basis | Period-end allocation |

The system produces **₹ / m³** at three levels:
1. **Direct cash cost / m³** — only out-of-pocket, ignoring depreciation.
2. **Full cost / m³** — direct + allocated overhead + depreciation.
3. **Full cost + finance + royalty / m³** — the "all-in" benchmark used for pricing decisions.

Comparison is shown:
- Quarry A vs Quarry B (Vatsin Granite vs Paradiso)
- Grade A vs B vs C
- Colour-wise (Black Galaxy vs Paradiso Classico vs Paradiso Bash)
- Bench-wise — to spot benches that are uneconomic at current prices
- This-month vs last-month vs 12-month average

#### 4.13A.3 Budgeting, Forecasting & Variance

- Annual budget at month × cost-centre × ledger granularity, plus production budget in m³ per quarry per month.
- Quarterly rolling forecast.
- Monthly variance report: Actual vs Budget vs Forecast, with reason codes (price, volume, mix, fx).
- Capex budget separately tracked with go/no-go gates for procurement of major assets (e.g., new wire-saw machine, new excavator).
- Sensitivity workbook: if diesel rises by ₹5/L, royalty rises by ₹X/m³, USD-INR moves by ₹2 — automatic impact on EBITDA per quarry.

#### 4.13A.4 Working Capital & Cash Management

| Component | What the system manages |
|---|---|
| **Receivables (domestic)** | Customer-wise outstanding, credit limit utilisation, ageing buckets (0–30, 31–60, 61–90, 91–180, >180), automated dunning, dispute log |
| **Receivables (export)** | Shipping-bill-wise outstanding, BL date, due date, EDPMS status (open / closed / overdue), FIRC reconciliation, write-back of forex gain/loss |
| **Inventory of blocks** | m³ × cost / m³ × ageing — converted into ₹ tied-up; ageing > 90 days flagged as slow-moving for sales push |
| **Inventory of stores** | Consumables ₹, slow / non-moving stores items |
| **Payables** | Vendor-wise outstanding, due-date calendar, MSME ≤45-day rule monitor (Sec 43B(h) Income-tax disallowance trigger), early-payment discount tracker |
| **Statutory dues** | Live ageing of GST, TDS, PF, ESI, PT, royalty — with a single "statutory dues calendar" |
| **Cash position** | Bank-by-bank balance live (where API allows), 13-week rolling cash-flow forecast |
| **DSO / DPO / DIO** | Daily computation of receivable / payable / inventory days |
| **Working capital gap** | Computed and compared to sanctioned cash-credit drawing power |

#### 4.13A.5 Treasury & Banking Operations

- Multi-bank visibility (current accounts, cash credit, term loans, export packing credit).
- Cash-credit (CC) limit monitoring with **monthly stock & receivables statement (MSOD)** and **quarterly QIS-I / QIS-II / QIS-III** auto-prepared from book balances — ready for bank upload.
- **Drawing power computation**: (paid stock × stock margin %) + (eligible debtors × debtor margin %) – creditors – statutory dues, in the format prescribed by the lending bank.
- **Loan ledger** per facility: sanction, disbursement, EMI / interest schedule, prepayment, foreclosure, interest accrual, balance confirmation.
- **Bank guarantee (BG) register**: BG to mining department (lease security), BG to TNPCB, BG to customs (where applicable) — with expiry alerts at 60/30/15 days.
- **Letter of Credit (LC)** for capital equipment imports (e.g., new wire-saw from Italy) — UCP 600 fields, margin money, expiry, document negotiation, BC accrual.
- **Positive Pay** file generation for cheque payments above the bank's threshold.
- **Bulk payment file** in the bank's prescribed format (HDFC / SBI / ICICI / Axis / Indian Bank / IOB — all common Indian bank formats).
- **Auto bank reconciliation** with statement import and rule-based matching.

#### 4.13A.6 Foreign Exchange (Paradiso Exports)

- Invoicing in USD / EUR with INR equivalent at the **customs notified rate** on date of let-export; gain/loss on realisation booked to forex P&L.
- **AD-Code bank mapping** per shipping bill.
- **EDPMS dashboard**: shipping bills awaiting realisation, due date (9 months from shipment), overdue alerts requiring extension request to AD bank / RBI.
- **FIRC capture** with bank advice upload; auto-matching to invoice / shipping bill.
- **Forward contract / hedge register**: notional amount, maturity, MTM, gain/loss on settlement, hedge effectiveness for accounting purposes.
- **GR / SDF waiver** tracking where applicable (small exports).
- **RoDTEP scrip ledger**: scrip number, value, expiry, status (held / sold / utilised), realisation if sold in market.
- **LUT** (Letter of Undertaking) — single renewal alert on 1 April each financial year.

#### 4.13A.7 Fixed Asset & Mining Asset Accounting

- Asset block-wise register aligned to **Schedule II of the Companies Act 2013** and **Section 32 of the Income-tax Act 1961** (different rates / methods).
- Component accounting where mandated (e.g., engine, hydraulic system, undercarriage of an excavator depreciated separately if costs are material).
- **Capitalisation of mine development cost** (overburden removal, access road, dewatering pit) — amortised over the lease period or remaining reserves.
- **Borrowing cost capitalisation** for qualifying assets (Ind AS 23 / AS 16).
- **Impairment** review trigger when a bench / asset is permanently idled.
- **Disposal & scrap**: WDV write-off, profit/loss on sale, GST output on scrap sale.
- **Insurance register**: asset, policy, sum insured, premium, expiry, claim history, renewal calendar.
- **Asset physical verification** module with QR-tag scan on the mobile app.

#### 4.13A.8 Royalty as a Financial Discipline

Royalty is the single largest variable cost line for a granite quarry and is treated as a first-class financial citizen:

- Daily accrual entry (Dr. Royalty expense / Cr. Royalty payable) the moment a despatch event fires.
- Monthly settlement entry on payment of the royalty challan (Dr. Royalty payable / Cr. Bank).
- **Royalty reconciliation report**: (a) what should have been paid per system (m³ despatched × rate), (b) what was paid per challan, (c) what is shown in the Department's mineral despatch register — three-way match each month, with variance investigation flow.
- **Dead-rent vs royalty** comparison annually (whichever is higher per MMDR rules).
- **DMF / NMET** booked as separate sub-ledgers for clean reporting.
- **Environmental cess** and any other statutory levy per cubic metre handled as configurable levy lines on the same engine.

#### 4.13A.9 Statutory Provisioning & Year-end

- **Gratuity provision** based on actuarial valuation (PUC method); booking entry; payment on exit.
- **Leave encashment provision** based on closing balance × cost-to-company per day.
- **Bonus provision** based on allocable surplus (Payment of Bonus Act 1965); set-on / set-off ledger.
- **Mine closure provision** — created over remaining lease life per **MCDR 2017** mine closure plan, discounted at appropriate rate per Ind AS 37.
- **Provision for taxation** (current + deferred), **MAT credit** carry-forward.
- **Year-end close calendar**: cut-off, accruals, prepayments, inter-company, related party (Sec 188 Companies Act / Sec 92 Income-tax), cost-audit applicability check, IFC / ICFR documentation, statutory audit, tax audit (44AB), transfer pricing (where applicable).

#### 4.13A.10 Profitability Reporting — Granular

| View | What it shows |
|---|---|
| **By quarry** | Revenue, direct cost, contribution margin, allocated overhead, EBITDA, EBIT, PAT — Vatsin Granite vs Paradiso |
| **By grade / colour** | Revenue/m³, cost/m³, margin/m³ — Paradiso Classico A vs B, Paradiso Bash vs Paradiso Gold, Black Galaxy A vs B |
| **By customer** | Top-20 customers by revenue and by margin; share of wallet |
| **By export country / port** | Revenue, freight terms, realised margin in INR |
| **By bench** | m³ produced, recovery %, cost/m³, margin/m³ — identifies benches to push or close |
| **By machine** | Operating hours, fuel ₹, spares ₹, downtime ₹, asset profitability (vs hire-out alternative) |

#### 4.13A.11 Financial Dashboards (CFO View)

- **Daily**: cash balance per bank, daily collections, daily payments, daily royalty accrued, top-5 receivables today.
- **Weekly**: receivables ageing, payables ageing, CC drawing power vs limit, 13-week cash flow.
- **Monthly**: P&L vs budget vs last-year, EBITDA per quarry, working capital metrics, GST liability, ITC available, profitability per grade/colour, capex vs budget, loan calendar (EMI due / interest due).
- **Quarterly**: advance tax computation, board pack, lender pack (MSOD/QIS).
- **Annual**: full statutory audit pack, tax audit pack, MCA filing pack (AOC-4 / MGT-7), depreciation reconciliation (Companies Act vs Income-tax Act), MAT computation, deferred tax workings.

#### 4.13A.12 Internal Controls & Audit Trail

- **Maker-checker** on every financial transaction above configurable thresholds (e.g., payments > ₹1 lakh, journal entries > ₹50,000, vendor master changes, customer credit-limit changes).
- **Segregation of duties** matrix (e.g., a person who creates a vendor cannot approve the first payment to that vendor).
- **Approval matrix** for capex, write-offs, credit notes, expense claims.
- **Immutable audit log** for all financial postings with user, timestamp, IP, before/after image.
- **Period-lock** with controlled re-open and full audit trail.
- **Statutory-audit support pack** — one-click export of trial balance, ledger scrutiny, party confirmations, fixed asset additions/deletions, bank reconciliations, related-party transactions.

#### 4.13A.13 Financial KPIs the System Will Track

Revenue per m³, EBITDA per m³, full cost per m³, royalty as % of revenue, fuel cost per m³, electricity cost per m³, diamond-tool cost per m² sawn, recovery %, DSO, DPO, DIO, working-capital days, current ratio, debt-equity, interest cover (EBITDA / interest), return on capital employed (ROCE), return on net worth (RoNW), free cash flow, capex intensity, % statutory dues paid on time, audit observation count.

### 4.14 M14 — Employee Master, Attendance & Payroll

**Workforce categories supported**
- Permanent staff (office, supervisory, technical)
- Contract workers (under a registered contractor — **Contract Labour (R&A) Act 1970**)
- Piece-rate / job-rate workers (drillers, blasters, mason, helpers paid per metre / per block)
- Daily wage workers

**Capabilities**
- Employee master: PF UAN, ESI number, Aadhaar (masked), PAN, bank IFSC/A/c, statutory blaster / shotfirer / first-aid / mines-vocational training certificates with expiry.
- Biometric / face / RFID attendance integration; overtime per Mines Act / Factories Act.
- Shift roster with statutory daily and weekly rest.
- Leave (EL/CL/SL/maternity 26 weeks per Maternity Benefit Act / paternity / bereavement).
- Payroll run: basic, DA, HRA, conveyance, other allowances, statutory bonus (8.33%–20% per **Payment of Bonus Act 1965**), piece-rate, overtime, deductions.
- **Statutory deductions**: EPF 12% employee + 12% employer (with 8.33% to EPS), ESI 0.75% employee + 3.25% employer (wage ≤ ₹21,000), Professional Tax (TN slabs), TDS u/s 192.
- **Payment of Gratuity**: actuarial provision and payout on exit.
- Employee Compensation Act 1923 / Employees' Compensation Insurance for non-ESI workers.
- Wage register, muster roll, overtime register, advance register in formats prescribed under the **Code on Wages 2019** / TN Shops & Establishments / Mines Rules.
- Bank salary file (NEFT) generation; payslip e-mail / SMS / WhatsApp distribution.
- **PF ECR**, **ESI return**, PT return, Form 24Q TDS — data ready for upload.
- Full & final settlement with gratuity, leave encashment, notice recovery.

### 4.15 M15 — Mining Statutory Compliance

This is the heart of the platform and where most current pain is concentrated. The module is configured against the live regulatory framework applicable in Tamil Nadu.

| Statute / Rule | What the system manages |
|---|---|
| **Mines and Minerals (Development & Regulation) Act, 1957 (MMDR)** | Lease master, lease validity, transfer / surrender, dead-rent, annual return template. |
| **Tamil Nadu Minor Mineral Concession Rules, 1959 (TNMMCR, as amended)** | Quarry lease, permit-for-quarrying, royalty/seigniorage per m³ at the gazetted rate, monthly mineral return to the Assistant Director of Geology & Mining, DMF contribution. |
| **Mines Act, 1952 and Mines Rules, 1955** | Mines manager appointment, statutory registers, working-time, leave with wages, qualifications of persons employed, statutory examinations. |
| **Metalliferous Mines Regulations, 1961** | Daily report of mines, register of explosives, blast register, support register, gassiness, ventilation (where applicable). |
| **Mineral Conservation & Development Rules, 2017 (MCDR)** — administered by IBM | Mining plan, modification, MCDR monthly return (Form F1), annual return (Form H1), sustainable development framework (star-rating), e-permit. |
| **Explosives Rules, 2008 (PESO)** | Magazine licence, daily explosives register, blaster's competence certificate, transport of explosives. |
| **Mines Vocational Training Rules, 1966** | Initial / refresher training records for every worker. |
| **DGMS Circulars** | Statutory examination by mines manager, surveyor's plan updation each quarter, sand-stowing where applicable. |

**Royalty / Seigniorage Engine**
- Configurable **rate per cubic metre** as gazetted by the Government of Tamil Nadu (e.g., colour-graded granite has a higher rate than ordinary black granite). The rate table is versioned by effective-from date.
- Royalty accrued the moment a block is despatched out of the lease area (linked to the despatch event in M9).
- Monthly mineral return + royalty challan generation; e-payment status capture.
- **District Mineral Foundation (DMF)** contribution and **National Mineral Exploration Trust (NMET)** contribution computed automatically.
- Reconciliation report: extracted (m³) vs despatched (m³) vs royalty paid (₹) vs lease-permitted balance (m³).

**Statutory Registers Maintained Electronically**
- Form B — register of persons employed (Mines Rules)
- Form C — register of leave with wages
- Form D — register of compensation
- Form E — accident report (within 24 hours / 72 hours per severity)
- Daily report of mines (Reg. 9, MMR 1961)
- Magazine and explosives register (Explosives Rules)
- Form F1 (MCDR monthly), Form H1 (MCDR annual), Form F2 (statistics)

### 4.16 M16 — Labour & Tax Statutory Compliance

- **EPF & MP Act 1952** — monthly ECR (UAN-wise), KYC, PMRPY where applicable.
- **ESI Act 1948** — monthly contribution, accident report Form 12, IP register.
- **Tamil Nadu Professional Tax** — monthly / half-yearly return per local body slab.
- **Code on Wages 2019** — minimum wages (TN notification, granite quarry schedule), timely payment, no unauthorised deduction.
- **Payment of Bonus Act 1965** — allocable surplus, set-on/set-off, Form C, D.
- **Payment of Gratuity Act 1972** — Form F nomination, gratuity provision (15 days × last drawn / 26 × completed years).
- **Contract Labour (R&A) Act 1970** — principal-employer registration, contractor licence, half-yearly Form XXIV.
- **Maternity Benefit Act 1961** — 26-week paid leave, crèche where applicable.
- **Sexual Harassment of Women at Workplace Act 2013** — IC, annual report.
- Income-tax — TDS 192 on salaries, Form 16.

### 4.17 M17 — Environment & Pollution Control

- **Environment Clearance (EC)** under EIA Notification 2006 — capture validity, conditions, compliance reports (six-monthly to MoEFCC / SEIAA).
- **Consent to Establish (CTE)** and **Consent to Operate (CTO)** from Tamil Nadu Pollution Control Board (TNPCB) — Water Act 1974, Air Act 1981.
- **Hazardous & Other Wastes (Management) Rules 2016** — used-oil / sludge manifest.
- Ambient air quality, noise, vibration and ground-water records — uploaded periodically.
- Mine closure plan provisioning and progressive mine closure (per MCDR).
- Tree plantation / green-belt register.

### 4.18 M18 — Safety, Incident & First-aid Register

- Safety policy & SOP library.
- Daily safety inspection checklist (bench height, slope angle, edge protection, ladders, fall-of-ground).
- PPE issue register per worker (helmet, goggles, ear plugs, dust mask, safety shoes, reflective jacket).
- Toolbox talks — agenda, attendance, action items.
- Incident & accident — fatal / serious / reportable / first-aid — with **statutory intimation to DGMS** within prescribed timelines.
- Investigation report, root-cause, CAPA, closure verification.
- First-aid box and trained first-aider register.
- Emergency response plan, mock-drill schedule and observation report.

### 4.19 M19 — Permits & Mineral Despatch Permit (per m³)

In Tamil Nadu, every despatch of a minor mineral from the lease requires a valid **Mineral Despatch Permit (MDP)** raised on the State's mining portal, validated against the royalty paid and the permitted quantity. The platform automates the entire flow.

- **Despatch indent → System computes cubic metres → Submits permit request to the State portal (API/RPA) → Receives MDP number / e-permit → Prints on the gate-pass + invoice.**
- Per-cubic-metre fee, royalty, DMF, NMET, environmental cess auto-computed and printed on the permit.
- Mineral despatch register (MDR) maintained electronically; reconciled monthly with the Department.
- Alert when the lease's monthly / annual sanctioned despatch (m³) approaches threshold.
- Alerts for other permit renewals: PESO magazine licence, RTO fitness, factory licence (if crusher attached), TNPCB consent, EC validity, lease validity.

### 4.20 M20 — Document Management & Audit Vault

- Single, searchable repository for every scan: lease deeds, permits, RC books, invoices, challans, statutory returns, audit reports.
- Version control, role-based access, document expiry alerts.
- Tamper-evident audit vault with **WORM** (write-once-read-many) bucket for files required for the seven-year statutory retention period under the Income-tax Act / Companies Act.

### 4.21 M21 — Management Dashboards & MIS

- **Owner / MD dashboard** — daily m³ produced, daily despatched, daily collection, royalty payable, safety incidents, top-5 receivables.
- **Quarry GM dashboard** — bench-wise production, machine availability %, breakdown hours, blasting efficiency, magazine stock.
- **CFO dashboard** — cash position, receivables ageing, GST liability, ITC available, loan / EMI calendar, profitability per quarry.
- **Compliance dashboard** — calendar of all upcoming statutory due-dates (GSTR, PF, ESI, MCDR, royalty, fitness, insurance, EC compliance).
- **Export dashboard (Paradiso)** — shipment in transit, EDPMS open, RoDTEP scrip pending, FIRC pending, LUT validity.

### 4.22 M22 — Mobile App

- **Foreman** — log production, attendance, fuel issue, photo of blocks.
- **Operator** — start/stop machine, hour-meter reading, breakdown reporting.
- **Driver** — view despatch advice, scan block QR, receive e-way bill on phone.
- **Safety officer** — daily inspection checklist, raise incident with photo.
- **Offline-first**: data captured on site syncs when network is restored.

---

## 5. Regulatory Compliance — Detailed Mapping

This section maps every statutory obligation a granite quarry in Tamil Nadu must meet to the corresponding system module, the form/return name, the frequency, and the responsible role. This table is the basis for the compliance dashboard (M21).

| Obligation | Statute / Authority | Frequency | Module |
|---|---|---|---|
| GSTR-1 outward supplies | CGST Act / TN GST Act | Monthly (11th) | M12 |
| GSTR-3B summary & tax payment | CGST Act | Monthly (20th) | M12 |
| GSTR-9 annual return | CGST Act | Annual (31 Dec) | M12 |
| GSTR-9C reconciliation | CGST Act (turnover > ₹5 cr) | Annual | M12 |
| E-invoice (IRN) generation | Rule 48(4) CGST Rules | Real-time per invoice | M10 |
| E-way bill generation | Rule 138 CGST Rules | Real-time per despatch | M10 |
| TDS monthly deposit | Income-tax Act, Sec. 200 | Monthly (7th) | M12 |
| TDS quarterly returns (24Q/26Q) | Income-tax Act | Quarterly | M12 |
| TCS 206C(1H) | Income-tax Act | Monthly / Quarterly | M12 |
| Advance tax | Income-tax Act | Quarterly | M12 |
| Income-tax return | Income-tax Act | Annual | M12 |
| EPF ECR & challan | EPF & MP Act 1952 | Monthly (15th) | M14, M16 |
| ESI contribution & return | ESI Act 1948 | Monthly (15th) / Half-yearly | M14, M16 |
| Professional Tax (TN) | TN Town Panchayats / Municipalities | Monthly / Half-yearly | M14, M16 |
| Bonus & Form D | Payment of Bonus Act 1965 | Annual (within 30 days of payment) | M14, M16 |
| Gratuity provision & payout | Payment of Gratuity Act 1972 | On exit / annual provision | M14, M16 |
| Form XXIV — Contract Labour | Contract Labour (R&A) Act 1970 | Half-yearly | M16 |
| Royalty / Seigniorage payment | TN Minor Mineral Concession Rules 1959 | Per despatch / monthly | M15, M19 |
| Mineral Despatch Permit (MDP) | TN Minor Mineral Concession Rules | Per consignment (per m³) | M19 |
| DMF contribution | MMDR Act, Sec. 9B | With royalty | M15 |
| NMET contribution | MMDR Act, Sec. 9C | With royalty | M15 |
| MCDR Form F1 (monthly) | MCDR 2017 (IBM) | Monthly (10th) | M15 |
| MCDR Form H1 (annual) | MCDR 2017 (IBM) | Annual (1 July) | M15 |
| Mining plan / scheme review | MCDR 2017 | Five-yearly | M15 |
| Daily Report of Mines (DRM) | Metalliferous Mines Regulations 1961 | Daily | M15 |
| Explosives register & PESO licence | Explosives Rules 2008 | Daily register / 3-yearly renewal | M2, M19 |
| DGMS reportable accident | Mines Act 1952 / DGMS | Within prescribed hours | M18 |
| EC six-monthly compliance | EIA Notification 2006 | Half-yearly (1 Jun / 1 Dec) | M17 |
| TNPCB consent renewal | Water Act 1974 / Air Act 1981 | Periodic per CTO validity | M17 |
| Mine closure plan | MCDR 2017 | Progressive + final | M15, M17 |
| Annual ROC filings (AOC-4, MGT-7) | Companies Act 2013 | Annual | M11 |
| Statutory audit | Companies Act 2013 | Annual | M11 |
| Tax audit (44AB) | Income-tax Act | Annual (where applicable) | M11, M12 |
| LUT for exports | CGST Rule 96A | Annual (1 April) | M8, M12 |
| EDPMS realisation | FEMA, RBI | Per shipping bill (9 months) | M8, M13 |
| RoDTEP scrip claim | DGFT FTP 2023 | Per shipping bill | M8 |

---

## 6. Core Data Model (Indicative)

The following entities form the conceptual data backbone. Each entity carries created/updated audit fields, soft-delete flag, organisation-id and quarry-id for multi-site segregation.

| Entity | Key Attributes |
|---|---|
| **Quarry** | id, name, type (AB / Paradiso), lease-id, geo-polygon, status |
| **Lease** | lease-no, mineral, area (ha), permitted m³/year, royalty rate, validity from-to, gazette ref. |
| **Bench / Pit / Face** | id, quarry-id, RL, dimensions, current status |
| **Block** | block-no, quarry-id, bench-id, dimensions (L×B×H), gross m³, net m³, weight (t), grade, colour, photos, status, location |
| **BlastEvent** | blast-no, date, bench, holes, depth, charge (kg), explosives consumed, rock yield, blaster |
| **ExplosiveStock** | magazine-id, item, batch, qty in, qty out, balance |
| **Asset** | asset-no, category, make, model, serial, RC, ins. exp., book-value, current location |
| **MaintenanceJob** | asset-id, type (PM/BD), schedule, completion, downtime, cost, spares |
| **StockItem** | code, HSN, UOM, reorder, current qty, weighted-avg cost |
| **Vendor / Customer** | name, GSTIN, PAN, MSME, state, place-of-supply, bank, terms |
| **SalesOrder** | so-no, customer, lines (block ids / item), value, currency, terms, status |
| **DespatchAdvice** | da-no, vehicle, driver, blocks, weight, weighbridge slip |
| **TaxInvoice** | inv-no, IRN, type (B2B/B2C/Export), GST, place-of-supply, ack-no, e-way-no |
| **EWayBill** | ewb-no, distance, validity, vehicle, status, last action |
| **RoyaltyChallan** | period, m³ despatched, rate, royalty, DMF, NMET, total, paid-on, ref. |
| **MDP / Permit** | permit-no, issued-by, m³, validity, used / cancelled |
| **Employee** | emp-no, name, category, UAN, ESI, PAN, Aadhaar, certs, joining, status |
| **Attendance** | emp-id, date, in/out, shift, OT-hrs |
| **PayrollRun** | period, gross, deductions, net, PF, ESI, PT, TDS, payment date |
| **BankAccount / Loan** | bank, ac-no, IFSC, type, balance, EMI schedule |
| **Voucher / Journal** | voucher-no, type, date, narration, lines (debit/credit, ledger, cost-centre) |
| **SafetyIncident** | incident-no, severity, persons, time, body parts, investigation, CAPA |
| **ComplianceTask** | obligation, period, due-date, owner, status, evidence ref. |

---

## 7. Integrations

| System | Direction | Protocol | Purpose |
|---|---|---|---|
| NIC E-Way Bill Portal | Outbound + status | REST API via GSP | Generate, update, cancel, reject e-way bills |
| NIC IRP (e-invoice) | Outbound + IRN return | REST API via IRP | IRN, QR, e-invoice JSON |
| GSTN (GSTR-1 / 3B / 9) | Bi-directional | GSP/ASP | Return upload, GSTR-2B download for ITC match |
| TN State Mining Portal | Outbound (Permit), inbound (status) | REST / RPA where API absent | Mineral Despatch Permit, royalty challan |
| IBM Online (MCDR) | Outbound | Web upload / API | Form F1 monthly, Form H1 annual |
| PESO (Explosives) | Manual + scan upload | DMS | Magazine licence, transport |
| Banks (multiple) | Bi-directional | H2H SFTP / NEFT API | Payment file, statement, positive pay |
| AD-Code Bank (Export) | Bi-directional | SFTP / API | FIRC, EDPMS |
| ICEGATE / DGFT | Outbound | Filing / scrip claim | Shipping bill, RoDTEP |
| Weighbridge indicator | Inbound | RS-232 / TCP | Tare & gross weight capture |
| Biometric / RFID | Inbound | TCP / API | Attendance |
| WhatsApp Business API | Outbound | REST | Payslip, invoice, e-way bill PDF |
| E-mail / SMS gateway | Outbound | SMTP / REST | Notifications, OTP |

---

## 8. Non-Functional Requirements

| Attribute | Target |
|---|---|
| Availability | 99.5% monthly during business hours; planned-maintenance window Sundays 02:00–04:00 IST |
| Performance | Web page load < 2s on 4G; e-way bill round-trip < 5s |
| Concurrent users | 100 named users, 40 concurrent at peak |
| Scalability | Horizontal scale of API tier; database vertical scale to 200 GB; archive policy beyond 5 years |
| Data retention | Statutory data retained 8 years (Income-tax) / 10 years (lease) — WORM bucket |
| Backup / DR | Daily incremental, weekly full, off-site encrypted; RPO 24h, RTO 8h |
| Security | TLS 1.3, AES-256 at rest, MFA for finance/compliance roles, OWASP Top-10 controls, annual VAPT |
| Audit trail | Immutable log of every create/update/delete of master & transactional records |
| Localisation | ₹ INR primary; USD/EUR for export module; Tamil labels for field UI; IST timezone |
| Accessibility | WCAG 2.1 AA for office UI |
| Browser | Chrome / Edge / Firefox (latest 2 versions) |
| Data residency | All production data within India (AWS Mumbai / Azure Pune) |
| Privacy | Aligned with the Digital Personal Data Protection Act 2023; employee data minimisation; consent capture |

---

## 9. Roles & Access Control

| Role | Indicative Permissions |
|---|---|
| Managing Director | Read-all, dashboards, approvals over ₹X |
| Quarry GM | Operations CRUD, despatch approve, machinery, safety |
| Mines Manager | All operational + statutory mining registers, blast register |
| Mining Engineer / Surveyor | Bench, block, blast, survey |
| Foreman | Production capture (mobile), attendance |
| Workshop Manager | Asset, PM, breakdown, spares |
| Stores In-charge | Indent, GRN, issue, stock |
| Purchase Officer | RFQ, PO, vendor |
| Sales Executive (Domestic) | Quotation, sales order, invoice (domestic) |
| Export Manager | Export SO, packing, shipping, EDPMS |
| Despatch Clerk | Despatch advice, weighbridge, e-way bill |
| Weighbridge Operator | Weight capture only |
| Accountant | Vouchers, bank reco, GST returns, TDS |
| Finance Manager | All accounts + loans + treasury |
| HR Officer / Payroll Clerk | Employee, attendance, payroll, statutory returns |
| Compliance Officer | Mining, environmental, safety, permits |
| Safety Officer | Safety inspections, incidents, PPE |
| External CA (read-only) | Reports only for audit |
| System Administrator | Users, roles, masters, configuration |

---

## 10. Reports & Statutory Outputs

### 10.1 Operational Reports
- Daily Production Report (per quarry / consolidated)
- Bench-wise extraction (m³, blocks)
- Block ageing in stockyard
- Machine availability and utilisation
- Breakdown analysis (MTBF, MTTR)
- Fuel consumption per machine per hour
- Blasting efficiency (kg explosives / m³ rock)

### 10.2 Sales & Despatch Reports
- Daily despatch register
- Sales register (HSN-wise, customer-wise, state-wise)
- Outstanding & ageing
- Export shipments and realisation status
- e-Way bill log and exceptions

### 10.3 Finance, Tax & Audit Reports
- Trial Balance, P&L, Balance Sheet, Cash Flow (Schedule III)
- Cost per cubic metre — quarry-wise / grade-wise
- Bank reconciliation statement
- GSTR-1 / 3B / 9 / 9C audit packs
- ITC ledger and GSTR-2B reconciliation
- TDS return (24Q/26Q/27Q/27EQ) data
- Loan / EMI schedule and interest accrual
- Fixed asset register with depreciation

### 10.4 Payroll & Labour Reports
- Payroll register, payslip pack, salary bank file
- PF ECR, ESI contribution, PT challan
- Bonus computation (Form C, D)
- Gratuity actuarial schedule
- Contract labour Form XXIV
- Form 16 / 16A pack

### 10.5 Statutory Mining Reports
- Daily Report of Mines (DRM)
- Monthly mineral return + royalty challan
- MCDR Form F1 (monthly), Form H1 (annual)
- Lease balance: permitted vs extracted vs despatched (m³)
- Mineral Despatch Permit register
- Blast register and magazine register
- Safety incident register and CAPA tracker
- Environmental compliance pack (EC, CTO, plantation, ground-water)

---

## 11. Implementation Roadmap

| Phase | Duration | Scope | Key Deliverables |
|---|---|---|---|
| **Phase 0 — Discovery** | 4 weeks | Process study, current-state mapping, masters cleansing | Signed-off BRD, master data templates |
| **Phase 1 — Foundation** | 8 weeks | M1, M3, M4, M6, M9, M11, M12 (core operations + accounts + GST) | Production capture, weighbridge, GL, GSTR-1/3B |
| **Phase 2 — Compliance & Sales** | 8 weeks | M2, M7, M10, M13, M15, M19 (blasting, sales, e-way bill, royalty, MDP) | Royalty engine, e-way bill, mineral despatch permit |
| **Phase 3 — People & Safety** | 6 weeks | M5, M14, M16, M17, M18 (maintenance, payroll, labour, environment, safety) | Preventive maintenance, payroll, PF/ESI, safety registers |
| **Phase 4 — Export & MIS** | 6 weeks | M8, M21, M22 (Paradiso exports, dashboards, mobile) | Export documentation, dashboards, Android app |
| **Phase 5 — Hyper-care & Audit Readiness** | 8 weeks | Stabilisation, statutory audit support, training | Go-live sign-off, audit-pack rehearsals |

**Total indicative duration:** 9–10 months end-to-end from kick-off to hyper-care close-out.

**Indicative team:** 1 project manager, 1 solution architect, 1 BA per stream (operations, finance, HR-payroll, compliance), 4 full-stack engineers, 1 mobile engineer, 1 QA lead + 1 QA, 1 DevOps. Final sizing to be confirmed during Phase 0.

---

## 12. Key Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Master-data quality (blocks, vendors, employees) poor | High | High | Phase 0 cleansing sprint; data-quality scorecard; freeze date |
| Connectivity at quarry site unreliable | High | Medium | Offline-first mobile, local cache server, periodic sync |
| NIC e-way bill / IRP downtime | Medium | High | Retry queue, fallback printing, monitoring |
| TN mining portal lacks open API for MDP | Medium | High | Hybrid: RPA + manual confirmation; manual override with audit trail |
| Changes in royalty rate / GST rate | Medium | Medium | Rate-table versioning; effective-date driven |
| User adoption among field workers | High | High | Tamil UI, voice / icon driven mobile, on-site trainers, incentives |
| Data privacy under DPDP Act 2023 | Medium | High | Consent, minimisation, role-based access, DPIA |
| Cybersecurity (ransomware on small business) | Medium | High | MFA, backups, EDR on endpoints, annual VAPT |

---

## 13. Indicative Cost & Effort (Order of Magnitude)

Numbers below are order-of-magnitude estimates intended for early budgeting. Final pricing will depend on Phase 0 outcomes, choice of build vs. configure-an-ERP, deployment model, and the number of named users.

| Item | Indicative One-time (₹ Lakh) | Indicative Annual (₹ Lakh) |
|---|---|---|
| Software licence / build (custom build option) | 70 – 120 | — |
| Software subscription (SaaS option, 25 named users) | — | 12 – 24 |
| Implementation services (BA, dev, QA, PM, DevOps) | 60 – 95 | — |
| Integrations (e-way bill via GSP, e-invoice, banks, ICEGATE) | 8 – 14 | 2 – 4 (GSP/ASP) |
| Infrastructure (cloud, backup, DR) | — | 6 – 10 |
| Mobile devices, biometric, weighbridge integration kit | 6 – 12 | — |
| Annual maintenance & support (post-warranty, custom-build option) | — | 15 – 22 |
| Training & change-management | 4 – 8 | 1 – 2 |
| Statutory / audit support (additional CA hours) | — | 2 – 4 |
| **Contingency (15%)** | Add | Add |

---

## 14. Acceptance Criteria

- Every cubic metre extracted is traceable from blast → block → stockyard → despatch → invoice → royalty challan → GL posting → statutory return.
- 100% of B2B despatches above ₹50,000 are accompanied by a system-generated e-way bill before the vehicle leaves the gate.
- GSTR-1 and GSTR-3B can be filed for any past month within 30 minutes of period-close, with zero manual data entry.
- Monthly mineral return and royalty challan are produced on or before the statutory due-date for three consecutive months without manual intervention.
- Preventive maintenance compliance on the top-20 critical assets is above 95% for three consecutive months.
- Payroll run for 110+ workers (mixed categories) completes within 4 hours, with PF/ESI/PT/TDS challans generated automatically.
- DGMS / IBM / GST / statutory auditor data requests are served from the system within 15 minutes.
- Management dashboard available on mobile to the MD with end-of-day data by 21:00 IST daily.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| AD-Code | Authorised Dealer Code — bank branch code attached to IEC for export realisation |
| CTE / CTO | Consent to Establish / Consent to Operate — pollution control consents |
| DGMS | Directorate General of Mines Safety |
| DGFT | Directorate General of Foreign Trade |
| DMF | District Mineral Foundation |
| DPR | Daily Production Report |
| EC | Environmental Clearance |
| ECR | Electronic Challan-cum-Return (EPF) |
| EDPMS | Export Data Processing and Monitoring System (RBI) |
| EWB | E-Way Bill |
| FIRC | Foreign Inward Remittance Certificate |
| GSP / ASP | GST Suvidha Provider / Application Service Provider |
| HSN | Harmonised System of Nomenclature (HSN 2516 = granite blocks/slabs) |
| IBM | Indian Bureau of Mines |
| IEC | Importer-Exporter Code |
| IRN | Invoice Reference Number (e-invoice) |
| LUT | Letter of Undertaking (export without IGST) |
| MCDR | Mineral Conservation & Development Rules 2017 |
| MDP | Mineral Despatch Permit |
| MMDR | Mines and Minerals (Development & Regulation) Act 1957 |
| NMET | National Mineral Exploration Trust |
| PESO | Petroleum and Explosives Safety Organisation |
| PM / BD | Preventive Maintenance / Breakdown |
| RoDTEP | Remission of Duties and Taxes on Exported Products |
| TNMMCR | Tamil Nadu Minor Mineral Concession Rules 1959 |
| TNPCB | Tamil Nadu Pollution Control Board |

---

## 16. Gap Analysis & Refinements (v1.1 Addendum)

A structured review of v1.0 identified the following operational, regulatory and platform gaps. This addendum closes them by introducing eight additional modules (M23–M30) and ten cross-cutting refinements. Each item references the v1.0 section it extends so the baseline remains intact.

### 16.1 Gap Summary

| # | Gap Found in v1.0 | Resolution |
|---|---|---|
| G1 | No explicit handling of geological reserves, mine plan, depleted reserves, or quarterly DGPS surveyor's plan reconciliation | New module **M23 — Geological & Mine Planning** |
| G2 | No quality control / lab testing workflow (IS 14223, water absorption, compressive strength, density) | New module **M24 — Quality Lab & Sample Management** |
| G3 | Vehicle/driver/transporter masters and GPS tracking under-specified | New module **M25 — Logistics, Transporter & Fleet GPS** |
| G4 | Visitor / contractor entry and mandatory safety induction missing | New module **M26 — Visitor & Contractor Gate Management** |
| G5 | Statutory periodic medical examination (Mines Rules 29B), silicosis screening absent | New module **M27 — Occupational Health & PME** |
| G6 | No customer/buyer-facing portal (samples, order tracking, statements, downloads) | New module **M28 — Customer & B2B Portal** |
| G7 | ESG / BRSR / CSR / carbon-water footprint not covered | New module **M29 — Sustainability, CSR & BRSR** |
| G8 | Platform operations (multi-environment, integration governance, DR drills) lightly covered | New module **M30 — Platform Operations & SRE** |
| G9 | Sanctions screening for export buyers (OFAC/EU/UN) missing | Refinement R1 in M8 |
| G10 | GST reverse-charge for unregistered contractors / GTA not made explicit | Refinement R2 in M12 |
| G11 | Cost audit applicability (Companies (Cost Records & Audit) Rules 2014 — mining covered) absent | Refinement R3 in M11 |
| G12 | Data migration strategy from legacy Tally / Excel not documented | Refinement R4 in Section 11 |
| G13 | Emergency Response Plan / On-site & Off-site Emergency Plan (per Mines Act) absent | Refinement R5 in M18 |
| G14 | Whistle-blower / Vigil mechanism (Companies Act Sec 177) not covered | Refinement R6 in M20 |
| G15 | Insurance register (asset, WC, group medical, marine, transit) consolidated | Refinement R7 in M4 / M13 |
| G16 | Subsidies & incentives ledger (state mining subsidy, MSME, RoDTEP already covered) | Refinement R8 in M11 |
| G17 | Photo / video evidence as a cross-cutting requirement not enumerated | Refinement R9 (cross-cutting) |
| G18 | Notification & alert framework (SMS / Email / WhatsApp / Push) not consolidated | Refinement R10 (cross-cutting) |

### 16.2 New Module — M23. Geological & Mine Planning

Reserves and mine-plan management is the upstream input to every cubic metre the company will ever sell. The system makes it a living, monthly-updated record rather than a static PDF in a drawer.

- **Mining plan & scheme of mining** — current approved plan upload, validity, conditions, deviation log.
- **Reserve register**: proved, probable, possible — in m³ and ₹ value at current realisation; auto-decrement as production occurs.
- **Bench-wise reserve estimation** with grade and colour assumption.
- **Quarterly surveyor's plan** (DGPS / total station) — upload by the qualified surveyor with the statutory certificate; system compares **plan-based extracted volume** vs **production-based extracted volume** (from M1) and flags variance > 5 % for investigation. This is the cornerstone of royalty defence.
- **Drone volumetric survey** integration — monthly drone fly-over (DJI / Phantom / RTK) produces a point-cloud / DEM; the platform imports cut-and-fill volumes and reconciles to M1.
- **3D quarry model** (optional) — geo-spatial view of benches, faces, dumps, magazines, stockyard, roads, lease polygon.
- **Lease polygon validation**: every block's blast geo-tag is checked against the lease polygon — alert if blasting is recorded outside lease, which is a serious statutory violation.
- **Mine closure plan integration** — progressive closure obligations tracked alongside production.
- **Waste dump & overburden register** — m³ moved to dumps; dump stability monitoring; integration with environmental compliance.

### 16.3 New Module — M24. Quality Lab & Sample Management

- **IS standard library**: IS 14223 (granite), IS 1124 (water absorption), IS 1121 (compressive strength), IS 13630 (slab tests), test method library.
- **Sample register**: sample number, source block, customer / batch, dispatched-for-test date, lab.
- **Test result capture**: density, water absorption %, apparent porosity, compressive strength (MPa), flexural strength, abrasion, polish-test reading — with photo of sample and lab certificate.
- **Acceptance / rejection** workflow against customer specification or IS thresholds; rejected blocks routed to scrap / lower-grade sales.
- **Customer-shared sample tracker**: free samples / commercial samples issued to overseas buyers, sample value GST-treatment, cost of samples allocated.
- **Export-buyer-specific QC matrix** — some buyers require additional tests (e.g., radon emission for kitchen worktop markets) — captured per buyer.

### 16.4 New Module — M25. Logistics, Transporter & Fleet GPS

- **Vehicle master** (own + hired): RC, fitness certificate, insurance, PUC, permit (national / state), load capacity, axle configuration.
- **Driver master**: licence number with class endorsements, validity, badge for hazardous-goods (where applicable), training, blood group.
- **Transporter master**: GSTIN / RCM applicability (GTA), bank, e-way bill enrolment number, rate contracts (per km / per trip / per MT).
- **Freight contracts** (open / spot / contract) and freight bill verification.
- **GPS / telematics integration**: live position, geo-fence in/out events (quarry, stockyard, delivery PIN, check-post), idle time, harsh braking, overspeed.
- **Trip log**: dispatch advice → vehicle assignment → loading start/end → gate-out → in-transit waypoints → delivered → return → unloading.
- **Driver allowance, halt, detention** auto-computation.
- **Fuel-card / fuel issue** integration tied to vehicle + trip for accurate per-trip cost.

### 16.5 New Module — M26. Visitor & Contractor Gate Management

Indian mines are subject to strict visitor and contractor controls under DGMS guidance. The gate is the single most important compliance touchpoint.

- **Pre-registration** of visitors and contractor staff (Aadhaar-masked, photo, purpose, host, ETA).
- **One-time safety induction** before entry (video + quiz); induction validity (e.g., 6 months) — re-induction triggered automatically.
- **PPE check-in / check-out** at gate.
- **Vehicle entry log** with weighbridge integration for any vehicle bringing material.
- **Contractor workforce master**: principal-employer registration, contractor licence, workmen list with PF/ESI compliance status from the contractor; bar entry of any worker without statutory cover.
- **Live in-mine head-count** for emergency mustering.
- **Visitor pass print** with QR; auto-revoke at end-of-day; overstay alert.

### 16.6 New Module — M27. Occupational Health & Periodic Medical Examination (PME)

- **Initial medical exam** before joining (Mines Rules 29B / Mines Vocational Training Rules).
- **Periodic medical exam** every 3 years for workers below 45 and every 2 years above 45 (or as per applicable rules).
- **Specific surveillance** for silicosis (granite dust is high silica), audiometry (drillers, blasters), vision (operators), pulmonary function (PFT).
- **Medical history & fitness certificate** stored against employee record; bar from hazardous-area assignment if not certified.
- **First-aid box stock**, expiry of medicines, first-aider competence register.
- **Group medical / WC / personal accident insurance** linkage from M13.
- **Health camp** records (community / employee).

### 16.7 New Module — M28. Customer & B2B Portal

A secure self-service portal for domestic dealers, builders, granite traders and overseas buyers — reduces sales overheads and accelerates collections.

- **Customer login** (own or buyer staff): order history, current outstanding, statement-of-account download, ageing.
- **Live block catalogue** (with photos, dimensions, grade, colour, price band) — only of unreserved blocks.
- **Online block reservation request** → routed to sales workflow for approval and proforma generation.
- **Sample request** with delivery address and tracking.
- **Payment online** (UPI, NEFT/RTGS, virtual account / NACH for dealers); auto-reconciliation in M11.
- **Document download**: tax invoices, e-way bills, e-invoice JSON/QR, signed shipping documents (for exporters), TDS certificates, MSME outstanding declaration.
- **Dispatch tracking** (linked to M25 GPS) with ETA and delivery proof.
- **Grievance / dispute** ticket with SLA.
- **Marketing**: new arrivals, new colour, promotional offers, factory visits.

### 16.8 New Module — M29. Sustainability, CSR & BRSR

- **Carbon footprint**: Scope 1 (diesel, explosives, DG), Scope 2 (TANGEDCO electricity), Scope 3 (logistics) computed monthly using emission factors; trend vs production.
- **Water footprint**: pumped from pit, used for dust-suppression / cutting / colony, discharged, recycled — daily meter readings.
- **Bio-diversity / green-belt**: trees planted, survival %, area under green cover (TNPCB requirement).
- **Energy mix**: % grid / DG / renewable (if solar rooftop or open access); KWh saved through efficiency projects.
- **CSR (Companies Act 2013, Sec 135)**: 2 % obligation tracker (if net worth ≥ ₹500 cr OR turnover ≥ ₹1000 cr OR PAT ≥ ₹5 cr applies), CSR committee, project ledger, Form CSR-1 / CSR-2 data.
- **BRSR-lite** (Business Responsibility & Sustainability Report) data points — applicable to top-1000 listed companies but increasingly demanded by overseas buyers and lenders.
- **Mine closure provision** funded as per MCDR; CFS / escrow tracker.
- **Supplier sustainability scorecard** — vendor self-declaration on labour, environment, anti-bribery.

### 16.9 New Module — M30. Platform Operations & SRE

The platform itself needs to run like an operation.

- **Environments**: DEV → QA → UAT → STAGING → PROD with clear data-masking rules for PII.
- **Release & change management**: bi-weekly release train, hot-fix process, change advisory.
- **Integration governance**: API catalogue, versioning, deprecation policy, contract testing, rate-limits, dead-letter queues.
- **Monitoring**: synthetic checks for e-way bill / e-invoice / GST endpoints, real-user monitoring, error budget per critical journey, alerting to on-call.
- **Backup & DR drill**: monthly restore test, six-monthly full DR fail-over rehearsal, RTO/RPO measured and reported.
- **Cybersecurity**: WAF, EDR, MFA, privileged-access management, secret vault, quarterly VAPT, annual ISO 27001-aligned audit, incident-response runbook, breach-notification SLA per DPDP Act 2023.
- **Capacity & cost-of-cloud** dashboard.

### 16.10 Cross-Cutting Refinements

**R1 — Export sanctions screening (extends M8).** Every overseas buyer, consignee, end-user, vessel and bank screened against the UN Consolidated, OFAC SDN, EU Consolidated and India MEA lists before order confirmation and again before shipment. Auto-block on positive hit with override workflow.

**R2 — GST Reverse Charge Mechanism (RCM) explicit (extends M12).** Specific RCM handling for: GTA (5%/12%), legal services, security services from non-body-corporate, sponsorship, director sitting fees, import of services, purchase from unregistered persons (specified categories), and self-invoicing under Sec 31(3)(f).

**R3 — Cost Audit applicability (extends M11).** Mining of granite (CTA chapter 25) is a regulated industry under the **Companies (Cost Records & Audit) Rules 2014**. Cost records are mandatory if turnover ≥ ₹35 cr; cost audit applies if turnover ≥ ₹50 cr (and product turnover ≥ ₹25 cr). The platform auto-generates the Form CRA-1 cost records and feeds the cost auditor pack (Form CRA-3 / CRA-4).

**R4 — Data Migration Strategy (extends Section 11).** Phase 0 includes:
- Tally TDL export → masters (ledger, customer, vendor, items), opening balances, bank balances.
- Excel template-led import for blocks-in-stockyard, machinery register, employee master, lease parameters.
- Two parallel-run months before go-live with daily reconciliation.
- A statutory cut-off date with mid-year migration permitted, and proper carry-forward of GST ITC, TDS, depreciation WDV.

**R5 — On-site & Off-site Emergency Plan (extends M18).** A formal Emergency Response Plan covering fall-of-ground, slope failure, flooding, fire in magazine, vehicle accident on haul road, mass casualty, fatal accident reporting (DGMS Form V), mock drills (quarterly), mutual-aid with neighbouring quarries / district administration.

**R6 — Whistle-blower / Vigil Mechanism (extends M20).** Anonymous channel per Sec 177 Companies Act, ICC reporting line per PoSH 2013, fraud / corruption / safety reporting; audit committee review; protection against retaliation.

**R7 — Consolidated Insurance Register (extends M4 / M13).** Single register for: machinery breakdown, machinery erection-all-risk, contractor's plant & machinery (CPM), fire & special perils for stockyard, transit insurance for outbound, marine insurance for exports, motor insurance, group personal accident, group medical (GMC), workmen compensation, cyber liability, directors & officers liability. Each policy: insurer, policy no, period, sum insured, premium, claim history, renewal alert at 60/30/7 days.

**R8 — Subsidy & Incentive Ledger (extends M11).** State / Centre incentives the company may claim — TN industrial subsidy, capital investment subsidy, electricity duty exemption, MSME interest subvention, RoDTEP scrips, drawback (if applicable), employment-linked incentives. Each tracked from application → sanction → receipt → utilisation.

**R9 — Photo & Video Evidence (cross-cutting).** Every safety incident, blast, dispatch, stuffing, accident, audit observation, board / face inspection, surveyor measurement and PPE issue can carry an evidence gallery (photo + short video) with geo-tag, timestamp, hash, and tamper-evident storage. Drives DGMS / IBM / customer trust.

**R10 — Notification & Alert Framework (cross-cutting).** A single platform service for SMS (DLT-compliant), e-mail, WhatsApp Business API, in-app push, and voice OTP. User-level subscription, do-not-disturb, escalation matrix, delivery receipts. Templates pre-approved for: payslip dispatch, statement-of-account, e-way bill PDF, OTP, dispatch tracking, payment confirmation, statutory due-date reminder.

### 16.11 Updated Module Map (Consolidated)

For convenience, the full module map after v1.1 stands at 30 modules: M1–M22 (v1.0) plus M23 Geological & Mine Planning, M24 Quality Lab, M25 Logistics & GPS, M26 Visitor/Contractor Gate, M27 Occupational Health & PME, M28 Customer Portal, M29 Sustainability & CSR/BRSR, M30 Platform Operations & SRE.

### 16.12 Refined Implementation Roadmap (v1.1)

The new modules fit into the existing six-phase plan as follows:

| Phase | v1.0 Scope | v1.1 Additions |
|---|---|---|
| Phase 0 — Discovery | Process study, masters cleansing | Data migration design (R4), reserves & mine-plan baseline (M23) |
| Phase 1 — Foundation | Core ops, GL, GST | M23 Mine Plan, M24 Quality Lab (basic), R3 cost records, R10 alerts |
| Phase 2 — Compliance & Sales | Blasting, sales, e-way, royalty | M25 Logistics (own fleet), R1 sanctions screening, R2 RCM |
| Phase 3 — People & Safety | Maintenance, payroll, safety | M26 Gate, M27 Occupational Health, R5 Emergency Plan |
| Phase 4 — Export & MIS | Paradiso exports, dashboards, mobile | M28 Customer Portal, M29 Sustainability/CSR/BRSR, R7 Insurance register |
| Phase 5 — Hyper-care | Stabilisation, audit pack | M30 SRE & DR drills, R6 vigil channel, R9 evidence framework |

**Revised total indicative duration:** 11–12 months (was 9–10) and incremental indicative budget +18–25 % over the v1.0 estimate. Final sizing in Phase 0.

### 16.13 Updated Acceptance Criteria (v1.1 Additions)

- Quarterly DGPS surveyor's plan reconciles with system-recorded extraction within 5% variance for three consecutive quarters.
- 100% of new joiners cleared by M27 PME before allocation to hazardous areas.
- Zero unscreened export buyer / consignee passes through M8 (R1 control).
- Monthly drone volumetric reconciliation completed within 7 days of fly-over.
- CSR obligation (if applicable) tracked at >95% utilisation in the financial year.
- DR drill executed every six months with documented RTO/RPO met.
- Customer portal adoption ≥ 60% of active customers within 6 months of go-live.

### 16.14 Open Items / Future Phases (Beyond v1.1)

- IoT on weighbridge and on fuel tanks for tamper-proof readings.
- ML-driven price recommendation per grade/colour using historical realisations.
- Predictive maintenance using sensor data from excavators (OEM telematics).
- Carbon credits monetisation pathway (if scale supports).
- Blockchain-based block provenance for premium export markets.
- Integration with state's proposed e-mining portal upgrades.

---

## 17. Document Sign-off

By signing below, the undersigned acknowledge that this Software Solution Specification represents the agreed scope, modules, regulatory coverage, and acceptance criteria for the Integrated Quarry Management & ERP Platform for Vatsin Granite Quarry Pvt. Ltd. and its Paradiso Multi-Colour Granite division.

| Role | Name | Signature & Date |
|---|---|---|
| Managing Director | | |
| Quarry General Manager | | |
| Finance & Accounts Head | | |
| Compliance Officer | | |
| IT / Solution Architect | | |

---

*— End of Document —*

*© 2026 Vatsin Granite Quarry Pvt. Ltd. — Confidential — v1.1*
