// backend/migrations/seeds/panels.js
/**
 * 🌱 Standard Chemistry Panels with linked analytes
 */

module.exports = [
  {
    name: "Liver Function Test (LFT)",
    description: "Evaluates liver enzymes and proteins",
    analytes: [
      "ALT/SGPT",
      "AST/SGOT",
      "Alkaline Phosphatase",
      "Total Bilirubin",
      "Direct Bilirubin",
      "Albumin",
      "Total Protein",
      "Globulin",
    ],
  },
  {
    name: "Renal Function Test (RFT)",
    description: "Assesses kidney performance indicators",
    analytes: ["Urea", "Creatinine", "Uric Acid"],
  },
  {
    name: "Lipid Profile",
    description: "Measures cholesterol and triglycerides levels",
    analytes: [
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Total Cholesterol",
      "Triglycerides",
    ],
  },
  {
    name: "Electrolyte Panel",
    description: "Monitors body salt balance",
    analytes: ["Sodium", "Potassium", "Calcium"],
  },
  {
    name: "Glucose Panel",
    description: "Checks glucose metabolism",
    analytes: ["HbA1c", "Fasting plasma Glucose", "Random plasma Glucose"],
  },
];
