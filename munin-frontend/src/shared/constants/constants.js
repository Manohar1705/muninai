/* ============================== STATIC CONFIG ============================== */
// Presentation-only reference data not owned by the backend (module list
// mirrors the backend's fixed MODULES constant; SME role labels are display
// metadata for the Sessions attendee line).
const MODULES = [
  "Payments Core",
  "Batch & Settlement",
  "Channel APIs",
  "Fraud Screening",
  "Reporting & Recon",
  "Customer Notifications",
  "Knowledge Management",
  "Operations",
  "Integrations",
  "Infrastructure",
  "Authentication & Access"
];

const SME = {
  "Rajesh Iyer": "Incumbent SME, Payments Core",
  "Priya Nair": "Incumbent SME, Payments Core",
  "Marcus Weber": "Incumbent SME, Batch & Settlement",
  "Ines Almeida": "Incumbent SME, Fraud Screening",
  "Daniel Kowalski": "Incumbent SME, Reporting & Recon",
  "Sofia Conti": "Incumbent SME, Customer Notifications",
  "Tom Okafor": "Incoming Engineer",
  "Lena Fischer": "Incoming Engineer",
  "Yusuf Demir": "Incoming Engineer",
};

const PHASES = ["Discovery", "KT", "Shadow", "Reverse Shadow", "Cutover", "Steady State"];
export {
  MODULES,
  SME,
  PHASES,
};