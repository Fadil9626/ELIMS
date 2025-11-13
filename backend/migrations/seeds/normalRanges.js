// backend/migrations/seeds/normalRanges.js

/**
 * 🌱 Chemistry Normal Ranges
 * Aligned to standard male/female values.
 */
module.exports = [
  { name: "ALT/SGPT", gender: "Male", min: 0, max: 50 },
  { name: "ALT/SGPT", gender: "Female", min: 0, max: 35 },
  { name: "AST/SGOT", gender: "Male", min: 10, max: 40 },
  { name: "AST/SGOT", gender: "Female", min: 9, max: 32 },
  { name: "Albumin", gender: "Any", min: 38, max: 55 },
  { name: "Alkaline Phosphatase", gender: "Male", min: 65, max: 260 },
  { name: "Alkaline Phosphatase", gender: "Female", min: 50, max: 130 },
  { name: "Calcium", gender: "Any", min: 2.15, max: 2.67 },
  { name: "Creatinine", gender: "Male", min: 62, max: 123 },
  { name: "Creatinine", gender: "Female", min: 44, max: 88 },
  { name: "Urea", gender: "Any", min: 2.5, max: 7.5 },
  { name: "Uric Acid", gender: "Male", min: 0.20, max: 0.43 },
  { name: "Uric Acid", gender: "Female", min: 0.14, max: 0.36 },
  { name: "Total Bilirubin", gender: "Any", min: 0, max: 18.8 },
  { name: "Globulin", gender: "Any", min: 23, max: 35 },
];
