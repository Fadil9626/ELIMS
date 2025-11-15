--
-- PostgreSQL database dump
--

\restrict 4Qo5qm62fwi9VxaJ2HYKfJjiC4HReoykRGRHdFfkmN4yilDHHlchhgyoaJRsJek

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.departments (id, name, is_active, created_at) VALUES (1, 'Administration', true, '2025-11-08 18:58:15.276365+00');
INSERT INTO public.departments (id, name, is_active, created_at) VALUES (2, 'Chemistry', true, '2025-11-08 18:58:15.276365+00');
INSERT INTO public.departments (id, name, is_active, created_at) VALUES (3, 'Hematology', true, '2025-11-08 18:58:15.276365+00');
INSERT INTO public.departments (id, name, is_active, created_at) VALUES (4, 'Microbiology', true, '2025-11-08 18:58:15.276365+00');
INSERT INTO public.departments (id, name, is_active, created_at) VALUES (5, 'Serology', true, '2025-11-15 14:49:55.925742+00');
INSERT INTO public.departments (id, name, is_active, created_at) VALUES (6, 'Immunology', true, '2025-11-15 14:51:38.281607+00');


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (1, NULL, 'g/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (2, NULL, 'U/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (3, NULL, 'µmol/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (4, NULL, 'IU/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (5, NULL, 'mmol/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (6, NULL, 'ng/mL', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (7, NULL, '%', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (8, NULL, 'RLU', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (9, NULL, 'IU/mL', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (10, NULL, 'mL/min', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (11, NULL, 'pg/mL', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (12, NULL, 'pmol/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (13, NULL, 'nmol/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (14, NULL, 'mg/L', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (15, NULL, 'µg/dL', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (16, NULL, 'µUL/mL', NULL, true, '2025-11-11 18:01:18.433747+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (45, NULL, 'U/mL', NULL, true, '2025-11-11 18:18:26.956286+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (46, NULL, 'µg/L', NULL, true, '2025-11-15 14:22:24.166674+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (53, NULL, 'µIU/mL', NULL, true, '2025-11-15 15:27:03.129163+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (57, NULL, 'mIU/mL', NULL, true, '2025-11-15 15:27:03.129163+00');
INSERT INTO public.units (id, symbol, unit_name, description, is_active, created_at) VALUES (58, NULL, 'mg/L FEU', NULL, true, '2025-11-15 15:27:03.129163+00');


--
-- Data for Name: test_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (3, 'TEST', NULL, 50.00, 2, 2, NULL, false, true, NULL, '2025-11-09 17:37:23.132303+00', '2025-11-09 17:37:23.132303+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (4, 'Total Protein', NULL, 0.00, 2, NULL, 1, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (6, 'Globulin', NULL, 0.00, 2, NULL, 1, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (8, 'Total Bilirubin', NULL, 0.00, 2, NULL, 3, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (9, 'Direct Bilirubin', NULL, 0.00, 2, NULL, 3, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (10, 'Indirect Bilirubin', NULL, 0.00, 2, NULL, 3, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (11, 'ALT/SGPT', NULL, 0.00, 2, NULL, 4, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (12, 'AST/SGOT', NULL, 0.00, 2, NULL, 4, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (13, 'Gamma GT', NULL, 0.00, 2, NULL, 2, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (18, 'Potassium', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (19, 'Sodium', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-11 18:19:05.843549+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (23, 'Total Cholesterol', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (24, 'HDL Cholesterol', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (25, 'LDL Cholesterol', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (26, 'Triglycerides', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (27, 'Fasting plasma Glucose', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (28, 'Random plasma Glucose', NULL, 0.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (29, 'HbA1c', NULL, 0.00, 2, NULL, 7, false, true, NULL, '2025-11-11 18:29:33.702696+00', '2025-11-11 18:29:33.702696+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (5, 'Albumin', NULL, 45.00, 2, NULL, 1, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-12 06:54:03.664727+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (7, 'Alkaline Phosphatase', NULL, 60.00, 2, NULL, 2, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-12 11:54:15.612995+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (17, 'Calcium', NULL, 200.00, 2, NULL, 5, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-13 17:10:07.503424+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (22, 'Electrolytes Panel', NULL, 250.00, 2, NULL, NULL, true, true, NULL, '2025-11-11 18:20:35.261581+00', '2025-11-13 18:12:59.896376+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (14, 'Creatinine', NULL, 65.00, 2, NULL, 3, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-14 18:05:35.390566+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (15, 'Urea', NULL, 65.00, 2, 1, 5, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-14 18:06:14.839205+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (16, 'Uric Acid', NULL, 65.00, 2, 1, 5, false, true, NULL, '2025-11-11 18:19:05.843549+00', '2025-11-14 18:06:39.884168+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (20, 'Liver Function Test (LFT)', NULL, 350.00, 2, NULL, NULL, true, true, NULL, '2025-11-11 18:20:35.261581+00', '2025-11-14 18:09:03.548093+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (21, 'Renal Function Test (RFT)', NULL, 195.00, 2, NULL, NULL, true, true, NULL, '2025-11-11 18:20:35.261581+00', '2025-11-14 18:09:29.10789+00', true, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (30, 'eGFR', NULL, 0.00, 2, 1, 10, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (31, 'Magnesium', NULL, 0.00, 2, 1, 5, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (32, 'Phosphate (PO4)', NULL, 0.00, 2, 1, 5, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (33, 'Total CO2 (Bicarbonate)', NULL, 0.00, 2, 1, 5, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (34, 'CK (CPK)', NULL, 0.00, 2, 1, 2, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (35, 'CK-MB', NULL, 0.00, 2, 1, 2, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (36, 'LDH', NULL, 0.00, 2, 1, 2, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (37, 'Troponin I', NULL, 0.00, 2, 1, 6, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (38, 'Ferritin', NULL, 0.00, 2, 1, 6, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (39, 'Serum Iron', NULL, 0.00, 2, 1, 15, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (40, 'TIBC', NULL, 0.00, 2, 1, 15, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (41, 'Transferrin Saturation', NULL, 0.00, 2, 1, 7, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (42, 'C-Reactive Protein (CRP)', NULL, 0.00, 2, 1, 14, false, true, NULL, '2025-11-15 13:23:02.977534+00', '2025-11-15 13:23:02.977534+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (43, 'Insulin', NULL, 0.00, 2, 1, 16, false, true, NULL, '2025-11-15 13:23:13.309035+00', '2025-11-15 13:23:13.309035+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (44, 'C-Peptide', NULL, 0.00, 2, 1, 6, false, true, NULL, '2025-11-15 13:23:13.309035+00', '2025-11-15 13:23:13.309035+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (45, 'Chloride', NULL, 0.00, 2, 1, 5, false, true, NULL, '2025-11-15 13:24:34.480679+00', '2025-11-15 13:24:34.480679+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (51, 'TSH', NULL, 0.00, 6, NULL, 53, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (52, 'Free T3', NULL, 0.00, 6, NULL, 12, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (53, 'Free T4', NULL, 0.00, 6, NULL, 12, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (54, 'Vitamin B12', NULL, 0.00, 6, NULL, 11, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (67, 'PSA (Total)', NULL, 0.00, 6, NULL, 6, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (68, 'PSA (Free)', NULL, 0.00, 6, NULL, 6, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (55, 'Vitamin D (25-OH)', NULL, 0.00, 6, NULL, 6, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (70, 'AFP (Alpha Fetoprotein)', NULL, 0.00, 6, NULL, 6, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (49, 'RF Quantitative', NULL, 0.00, 6, NULL, 9, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (50, 'ASO Titre (Quantitative)', NULL, 0.00, 6, NULL, 9, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (65, 'HBsAg (Quantitative)', NULL, 0.00, 6, NULL, 8, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (60, 'H. pylori Antibody (Quantitative)', NULL, 0.00, 6, NULL, 8, false, true, NULL, '2025-11-15 15:06:28.490638+00', '2025-11-15 15:06:28.490638+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (61, 'H. pylori Stool Antigen (Quantitative)', NULL, 0.00, 6, NULL, 8, false, true, NULL, '2025-11-15 15:06:28.490638+00', '2025-11-15 15:06:28.490638+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (57, 'β-hCG (Quantitative)', NULL, 0.00, 6, NULL, 57, false, true, NULL, '2025-11-15 14:59:31.550374+00', '2025-11-15 14:59:31.550374+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (64, 'D-Dimer', NULL, 0.00, 6, NULL, 58, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (66, 'Creatinine Clearance', NULL, 0.00, 6, NULL, 10, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (71, 'CA 19-9', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (72, 'CA 15-3', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (73, 'CA 125', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (69, 'CEA (Carcinoembryonic Antigen)', NULL, 0.00, 6, NULL, 6, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (58, 'H. pylori Antibody Rapid (Qualitative)', NULL, 0.00, 5, NULL, NULL, false, true, NULL, '2025-11-15 15:06:19.93063+00', '2025-11-15 15:06:19.93063+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (59, 'H. pylori Stool Antigen Rapid (Qualitative)', NULL, 0.00, 5, NULL, NULL, false, true, NULL, '2025-11-15 15:06:19.93063+00', '2025-11-15 15:06:19.93063+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (74, 'CA 72-4', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (75, 'CA 27-29', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (76, 'NSE (Neuron Specific Enolase)', NULL, 0.00, 6, NULL, 45, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);
INSERT INTO public.test_catalog (id, name, code, price, department_id, sample_type_id, unit_id, is_panel, is_active, result_value, created_at, updated_at, panel_auto_recalc, qualitative_value, qualitative_values) VALUES (77, 'Acid Phosphatase (ACP)', NULL, 0.00, 6, NULL, 2, false, true, NULL, '2025-11-15 15:11:39.310962+00', '2025-11-15 15:11:39.310962+00', false, NULL, NULL);


--
-- Data for Name: normal_ranges; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (72, 11, 'Any', 'numeric', NULL, NULL, NULL, NULL, 2, 7, 55, '7 - 55 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:13:32.012755+00', '2025-11-15 14:13:32.012755+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (73, 12, 'Any', 'numeric', NULL, NULL, NULL, NULL, 2, 8, 48, '8 - 48 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:13:32.012755+00', '2025-11-15 14:13:32.012755+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (75, 7, 'Any', 'numeric', NULL, NULL, NULL, NULL, 2, 45, 115, '45 - 115 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:13:32.012755+00', '2025-11-15 14:13:32.012755+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (71, 29, 'Any', 'numeric', NULL, NULL, NULL, NULL, 7, 3.8, 6.0, '3.8 - 6.0 %', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (66, 25, 'Any', 'numeric', NULL, NULL, NULL, NULL, NULL, 0, 3.36, '<3.36 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (81, 24, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 1.0, 1.55, '1.0 - 1.55 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:13:32.012755+00', '2025-11-15 14:13:32.012755+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (84, 26, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 0.3, 1.7, '0.3 - 1.7 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:13:32.012755+00', '2025-11-15 14:13:32.012755+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (63, 23, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 0, 5.17, '0 - 5.17 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (64, 24, 'Male', 'numeric', NULL, NULL, NULL, NULL, 5, 0.9, 1.55, '0.9 - 1.55 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (65, 24, 'Female', 'numeric', NULL, NULL, NULL, NULL, 5, 1.0, 1.80, '1.0 - 1.80 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (67, 26, 'Male', 'numeric', NULL, NULL, NULL, NULL, 5, 0.68, 1.88, '0.68 - 1.88 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (68, 26, 'Female', 'numeric', NULL, NULL, NULL, NULL, 5, 0.46, 1.60, '0.46 - 1.60 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (69, 27, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 3.8, 5.6, '3.8 - 5.6 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (70, 28, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 3.9, 7.8, '3.9 - 7.8 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:30:39.140696+00', '2025-11-11 18:30:39.140696+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (1, 4, 'Any', 'numeric', NULL, NULL, NULL, NULL, 1, 65, 87, '65 - 87 g/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (2, 5, 'Any', 'numeric', NULL, NULL, NULL, NULL, 1, 38, 55, '38 - 55 g/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (3, 6, 'Any', 'numeric', NULL, NULL, NULL, NULL, 1, 23, 35, '23 - 35 g/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (4, 7, 'Male', 'numeric', NULL, NULL, NULL, NULL, 2, 65, 260, '65 - 260 U/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (5, 7, 'Female', 'numeric', NULL, NULL, NULL, NULL, 2, 50, 130, '50 - 130 U/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (6, 8, 'Any', 'numeric', NULL, NULL, NULL, NULL, 3, 0, 18.8, '0 - 18.8 µmol/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (7, 9, 'Any', 'numeric', NULL, NULL, NULL, NULL, 3, 0, 5.1, '0 - 5.1 µmol/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (8, 10, 'Any', 'numeric', NULL, NULL, NULL, NULL, 3, 0, 13.7, '0 - 13.7 µmol/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (9, 11, 'Male', 'numeric', NULL, NULL, NULL, NULL, 4, 0, 50, '0 - 50 IU/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (10, 11, 'Female', 'numeric', NULL, NULL, NULL, NULL, 4, 0, 35, '0 - 35 IU/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (11, 12, 'Male', 'numeric', NULL, NULL, NULL, NULL, 4, 10, 40, '10 - 40 IU/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (12, 12, 'Female', 'numeric', NULL, NULL, NULL, NULL, 4, 9, 32, '9 - 32 IU/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (13, 13, 'Male', 'numeric', NULL, NULL, NULL, NULL, 2, 11, 50, '11 - 50 U/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (14, 13, 'Female', 'numeric', NULL, NULL, NULL, NULL, 2, 7, 32, '7 - 32 U/L', 18, 120, NULL, NULL, '2025-11-11 18:22:21.15586+00', '2025-11-11 18:22:21.15586+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (15, 14, 'Male', 'numeric', NULL, NULL, NULL, NULL, 3, 62, 123, '62 - 123 µmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (16, 14, 'Female', 'numeric', NULL, NULL, NULL, NULL, 3, 44, 88, '44 - 88 µmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (17, 15, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 2.5, 7.5, '2.5 - 7.5 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (18, 16, 'Male', 'numeric', NULL, NULL, NULL, NULL, 5, 0.20, 0.43, '0.20 - 0.43 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (19, 16, 'Female', 'numeric', NULL, NULL, NULL, NULL, 5, 0.14, 0.36, '0.14 - 0.36 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (20, 19, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 135, 145, '135 - 145 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (21, 18, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 3.5, 5.3, '3.5 - 5.3 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (23, 17, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 2.15, 2.67, '2.15 - 2.67 mmol/L', 18, 120, NULL, NULL, '2025-11-11 18:23:12.441575+00', '2025-11-11 18:23:12.441575+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (93, 44, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0.5, 2.0, '0.5 - 2.0 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 14:22:34.866071+00', '2025-11-15 14:22:34.866071+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (94, 42, 'Any', 'numeric', NULL, NULL, NULL, NULL, 14, 0, 5, '0 - 5 mg/L', NULL, NULL, NULL, NULL, '2025-11-15 14:22:34.901369+00', '2025-11-15 14:22:34.901369+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (97, 34, 'Male', 'numeric', NULL, NULL, NULL, NULL, 2, 52, 336, '52 - 336 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.194329+00', '2025-11-15 14:24:09.194329+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (98, 34, 'Female', 'numeric', NULL, NULL, NULL, NULL, 2, 38, 176, '38 - 176 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.194329+00', '2025-11-15 14:24:09.194329+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (99, 35, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0.6, 6.3, '0.6 - 6.3 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.213757+00', '2025-11-15 14:24:09.213757+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (100, 45, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 96, 106, '96 - 106 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.245836+00', '2025-11-15 14:24:09.245836+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (101, 38, 'Male', 'numeric', NULL, NULL, NULL, NULL, 46, 30, 400, '30 - 400 µg/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.289484+00', '2025-11-15 14:24:09.289484+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (102, 38, 'Female', 'numeric', NULL, NULL, NULL, NULL, 46, 15, 150, '15 - 150 µg/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.289484+00', '2025-11-15 14:24:09.289484+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (103, 43, 'Any', 'numeric', NULL, NULL, NULL, NULL, 16, 2.6, 24.9, '2.6 - 24.9 µUL/mL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.310915+00', '2025-11-15 14:24:09.310915+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (104, 36, 'Any', 'numeric', NULL, NULL, NULL, NULL, 2, 140, 280, '140 - 280 U/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.328701+00', '2025-11-15 14:24:09.328701+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (105, 31, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 0.65, 1.05, '0.65 - 1.05 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.34741+00', '2025-11-15 14:24:09.34741+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (106, 32, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 0.8, 1.5, '0.8 - 1.5 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.372222+00', '2025-11-15 14:24:09.372222+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (107, 39, 'Male', 'numeric', NULL, NULL, NULL, NULL, 15, 65, 176, '65 - 176 µg/dL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.395538+00', '2025-11-15 14:24:09.395538+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (108, 39, 'Female', 'numeric', NULL, NULL, NULL, NULL, 15, 50, 170, '50 - 170 µg/dL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.395538+00', '2025-11-15 14:24:09.395538+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (109, 40, 'Any', 'numeric', NULL, NULL, NULL, NULL, 15, 240, 450, '240 - 450 µg/dL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.419414+00', '2025-11-15 14:24:09.419414+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (110, 33, 'Any', 'numeric', NULL, NULL, NULL, NULL, 5, 22, 29, '22 - 29 mmol/L', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.443934+00', '2025-11-15 14:24:09.443934+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (111, 41, 'Any', 'numeric', NULL, NULL, NULL, NULL, 7, 20, 50, '20 - 50 %', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.464123+00', '2025-11-15 14:24:09.464123+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (113, 30, 'Any', 'numeric', NULL, NULL, NULL, NULL, 10, 90, NULL, '>90 mL/min', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.507989+00', '2025-11-15 14:24:09.507989+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (112, 37, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 0.04, '<0.04 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 14:24:09.490602+00', '2025-11-15 14:24:09.490602+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (131, 64, 'Any', 'numeric', NULL, NULL, NULL, NULL, 14, 0, 0.5, '<0.5 mg/L', NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (132, 65, 'Any', 'numeric', NULL, NULL, NULL, NULL, 9, 0, 100, '<100 IU/mL', NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (134, 67, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 4, '0–4 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (135, 68, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 4, '0–4 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (136, 69, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 5, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (137, 70, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 40, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (139, 72, 'Any', 'numeric', NULL, NULL, NULL, NULL, 45, 0, 38, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (140, 73, 'Any', 'numeric', NULL, NULL, NULL, NULL, 45, 0, 35, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (141, 74, 'Any', 'numeric', NULL, NULL, NULL, NULL, 45, 0, 6.9, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (142, 75, 'Any', 'numeric', NULL, NULL, NULL, NULL, 45, 0, 38, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (143, 76, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 12.5, NULL, NULL, NULL, NULL, NULL, '2025-11-15 15:11:57.028941+00', '2025-11-15 15:11:57.028941+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (145, 51, 'Any', 'numeric', NULL, NULL, NULL, NULL, 53, 0.27, 4.2, '0.27 - 4.2 µIU/mL', NULL, NULL, NULL, NULL, '2025-11-15 15:27:22.089957+00', '2025-11-15 15:27:22.089957+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (114, 58, 'Any', 'qualitative', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Negative', NULL, NULL, NULL, NULL, '2025-11-15 15:06:40.494088+00', '2025-11-15 15:06:40.494088+00', '{Reactive,Non-Reactive}');
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (115, 59, 'Any', 'qualitative', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Negative', NULL, NULL, NULL, NULL, '2025-11-15 15:06:40.494088+00', '2025-11-15 15:06:40.494088+00', '{Reactive,Non-Reactive}');
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (146, 49, 'Any', 'numeric', NULL, NULL, NULL, NULL, 9, 0, 14, '<14 IU/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.677447+00', '2025-11-15 16:19:23.677447+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (147, 50, 'Any', 'numeric', NULL, NULL, NULL, NULL, 9, 0, 200, '0 - 200 IU/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.714511+00', '2025-11-15 16:19:23.714511+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (148, 52, 'Any', 'numeric', NULL, NULL, NULL, NULL, 12, 3.1, 6.8, '3.1 - 6.8 pmol/L', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.758724+00', '2025-11-15 16:19:23.758724+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (149, 53, 'Any', 'numeric', NULL, NULL, NULL, NULL, 12, 12, 22, '12 - 22 pmol/L', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.805503+00', '2025-11-15 16:19:23.805503+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (150, 54, 'Any', 'numeric', NULL, NULL, NULL, NULL, 11, 200, 900, '200 - 900 pg/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.865538+00', '2025-11-15 16:19:23.865538+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (151, 55, 'Any', 'numeric', NULL, NULL, NULL, NULL, 6, 30, 100, '30 - 100 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:23.908108+00', '2025-11-15 16:19:23.908108+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (154, 60, 'Any', 'numeric', NULL, NULL, NULL, NULL, 8, 0, 1, 'Negative <1 RLU', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.017921+00', '2025-11-15 16:19:24.017921+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (155, 61, 'Any', 'numeric', NULL, NULL, NULL, NULL, 8, 0, 1, 'Negative <1 RLU', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.064742+00', '2025-11-15 16:19:24.064742+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (158, 66, 'Any', 'numeric', NULL, NULL, NULL, NULL, 10, 90, NULL, '>90 mL/min', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.170061+00', '2025-11-15 16:19:24.170061+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (159, 67, 'Male', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 4, '0 - 4 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.199535+00', '2025-11-15 16:19:24.199535+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (160, 68, 'Male', 'numeric', NULL, NULL, NULL, NULL, 6, 0, 1.5, '0 - 1.5 ng/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.228687+00', '2025-11-15 16:19:24.228687+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (163, 71, 'Any', 'numeric', NULL, NULL, NULL, NULL, 45, 0, 37, '<37 U/mL', NULL, NULL, NULL, NULL, '2025-11-15 16:19:24.427578+00', '2025-11-15 16:19:24.427578+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (169, 77, 'Male', 'numeric', NULL, NULL, NULL, NULL, 2, 0.5, 1.9, '0.5 - 1.9 U/L', NULL, NULL, NULL, NULL, '2025-11-15 16:21:13.919957+00', '2025-11-15 16:21:13.919957+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (170, 77, 'Female', 'numeric', NULL, NULL, NULL, NULL, 2, 0.3, 1.1, '0.3 - 1.1 U/L', NULL, NULL, NULL, NULL, '2025-11-15 16:21:13.919957+00', '2025-11-15 16:21:13.919957+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (152, 57, 'Male', 'numeric', NULL, NULL, NULL, NULL, 57, 0, 3, '0 - 3 mIU/mL', NULL, NULL, NULL, 'Adult non-pregnant reference range', '2025-11-15 16:19:23.980102+00', '2025-11-15 16:19:23.980102+00', NULL);
INSERT INTO public.normal_ranges (id, analyte_id, gender, range_type, qualitative_value, symbol_operator, age_min, age_max, unit_id, min_value, max_value, reference_range_text, min_age, max_age, range_label, note, created_at, updated_at, qualitative_values) VALUES (153, 57, 'Female', 'numeric', NULL, NULL, NULL, NULL, 57, 0, 5, '0 - 5 mIU/mL', NULL, NULL, NULL, 'If positive or elevated, follow pregnancy interpretation chart', '2025-11-15 16:19:23.980102+00', '2025-11-15 16:19:23.980102+00', NULL);


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (1, 'View Patients', 'patients.view', 'patients', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (2, 'Create Patient', 'patients.create', 'patients', 'create', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (3, 'Update Patient', 'patients.update', 'patients', 'update', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (4, 'View Tests', 'tests.view', 'tests', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (5, 'Create Test', 'tests.create', 'tests', 'create', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (6, 'Enter Results', 'results.enter', 'results', 'enter', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (7, 'Verify Results', 'results.verify', 'results', 'verify', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (8, 'View Reports', 'reports.view', 'reports', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (9, 'Manage Inventory', 'inventory.view', 'inventory', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (10, 'View Settings', 'settings.view', 'settings', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (11, 'Edit Settings', 'settings.edit', 'settings', 'edit', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (12, 'Phlebotomy Access', 'phlebotomy.view', 'phlebotomy', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (13, 'Pathologist Access', 'pathologist.view', 'pathologist', 'view', '2025-11-08 18:58:15.276365+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (16, 'Edit Patients', 'patients.edit', 'patients', 'edit', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (17, 'Delete Patients', 'patients.delete', 'patients', 'delete', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (18, 'View Test Requests', 'test_requests.view', 'test_requests', 'view', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (19, 'Create Test Requests', 'test_requests.create', 'test_requests', 'create', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (20, 'Cancel Test Requests', 'test_requests.cancel', 'test_requests', 'cancel', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (22, 'Update Sample Collection Status', 'phlebotomy.collect', 'phlebotomy', 'collect', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (23, 'View Lab Work Queue', 'lab_work.view', 'lab_work', 'view', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (24, 'Enter Lab Test Results', 'lab_work.enter', 'lab_work', 'enter', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (25, 'View Results', 'results.view', 'results', 'view', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (28, 'Print Reports', 'reports.print', 'reports', 'print', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (29, 'View Billing', 'billing.view', 'billing', 'view', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (30, 'Record Payments', 'billing.collect', 'billing', 'collect', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (31, 'Manage Users', 'users.manage', 'users', 'manage', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (32, 'Manage Roles', 'roles.manage', 'roles', 'manage', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (33, 'Manage System Settings', 'settings.manage', 'settings', 'manage', '2025-11-10 12:20:09.740059+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (57, 'Pathologist: Enter', 'pathologist.enter', 'pathologist', 'enter', '2025-11-10 15:48:32.502295+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (58, 'Reports: Enter', 'reports.enter', 'reports', 'enter', '2025-11-10 15:50:02.92578+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (59, 'Patients: Manage', 'patients.manage', 'patients', 'manage', '2025-11-10 16:12:20.432709+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (60, 'View Patients', 'patients_view', 'patients', 'view', '2025-11-10 22:20:17.637285+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (61, 'Register Patients', 'patients_create', 'patients', 'create', '2025-11-10 22:20:17.676468+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (62, 'Create Test Request', 'requests_create', 'requests', 'create', '2025-11-10 22:20:17.679801+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (63, 'View Test Requests', 'requests_view', 'requests', 'view', '2025-11-10 22:20:17.68283+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (65, 'Record Sample Collection', 'phleb_collect', 'phlebotomy', 'collect', '2025-11-10 22:20:17.689001+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (66, 'Manage Staff & Roles', 'admin_users', 'admin', 'users_manage', '2025-11-10 22:20:17.692128+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (67, 'Phlebotomy: Update', 'phlebotomy.update', 'phlebotomy', 'update', '2025-11-11 09:25:35.566668+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (68, 'Requests: Collect', 'requests.collect', 'requests', 'collect', '2025-11-11 11:45:15.278824+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (69, 'Test_requests: Collect', 'test_requests.collect', 'test_requests', 'collect', '2025-11-11 11:47:19.165805+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (70, 'Patients: Collect', 'patients.collect', 'patients', 'collect', '2025-11-11 12:02:11.075356+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (71, 'Test_requests: Enter', 'test_requests.enter', 'test_requests', 'enter', '2025-11-11 15:11:52.517142+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (72, 'Test_requests: Manage', 'test_requests.manage', 'test_requests', 'manage', '2025-11-11 15:11:52.517142+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (73, 'Test_requests: Update', 'test_requests.update', 'test_requests', 'update', '2025-11-11 15:11:52.517142+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (74, 'Billing: Create', 'billing.create', 'billing', 'create', '2025-11-12 11:44:34.878125+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (75, 'Billing: Update', 'billing.update', 'billing', 'update', '2025-11-12 11:44:34.878125+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (76, 'Pathologist: Verify', 'pathologist.verify', 'pathologist', 'verify', '2025-11-12 12:42:27.741963+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (77, 'Reports: Verify', 'reports.verify', 'reports', 'verify', '2025-11-12 18:54:33.168761+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (78, 'Pathologist: Manage', 'pathologist.manage', 'pathologist', 'manage', '2025-11-13 10:39:14.624002+00');
INSERT INTO public.permissions (id, name, code, resource, action, created_at) VALUES (79, 'Results: Manage', 'results.manage', 'results', 'manage', '2025-11-13 10:39:14.624002+00');


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.roles (id, name, description, core, created_at) VALUES (9, 'Doctor', 'Requests tests and reviews clinical reports', true, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (10, 'Viewer', 'Read-only access for viewing patients and reports', false, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (1, 'Super Admin', NULL, true, '2025-11-08 18:58:15.276365+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (3, 'Administrator', 'System administrator', true, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (4, 'Receptionist', 'Registers patients and initiates test requests', true, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (5, 'Phlebotomist', 'Collects and processes specimen samples', true, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (7, 'Pathologist', 'Verifies and authorizes finalized results', true, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (8, 'Finance', 'Handles billing and payments', false, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (6, 'Laboratory Scientist', 'Performs laboratory testing and enters results', false, '2025-11-10 12:23:58.464748+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (15, 'Inventory Clerk', 'Manages stock and supplies', false, '2025-11-10 22:12:07.652702+00');
INSERT INTO public.roles (id, name, description, core, created_at) VALUES (17, 'Senior Lab Scientist', NULL, false, '2025-11-12 12:07:44.669722+00');


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.role_permissions (role_id, permission_id) VALUES (9, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (9, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 30);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 74);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 75);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 61);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 60);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 62);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 63);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 19);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 71);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 72);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 73);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 18);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (4, 5);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 24);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 3);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 60);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 70);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 65);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 67);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 12);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 68);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 63);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 69);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (5, 18);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 24);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 57);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 58);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 1);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 2);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 4);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 5);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 7);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 9);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 10);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 11);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 12);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 16);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 18);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 19);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 20);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 22);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 24);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 29);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 7);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (7, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 57);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 58);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (6, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 29);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (1, 30);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 30);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 31);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 32);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 33);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 57);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 58);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 59);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 60);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 61);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 62);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 63);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (3, 65);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 24);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 23);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 57);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 76);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 13);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 78);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 60);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 58);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 77);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 6);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 7);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 25);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (17, 79);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (8, 8);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (8, 28);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (8, 29);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (8, 30);
INSERT INTO public.role_permissions (role_id, permission_id) VALUES (15, 9);


--
-- Data for Name: test_panel_analytes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (21, 22, 33, 'Total CO2 (Bicarbonate)');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (22, 22, 45, 'Chloride');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (33, 21, 18, 'Potassium');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (34, 21, 19, 'Sodium');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (37, 21, 30, 'eGFR');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (38, 21, 32, 'Phosphate (PO4)');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (39, 21, 45, 'Chloride');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (2, 20, 4, 'Total Protein');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (3, 20, 5, 'Albumin');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (4, 20, 6, 'Globulin');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (5, 20, 7, 'Alkaline Phosphatase');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (6, 20, 8, 'Total Bilirubin');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (7, 20, 9, 'Direct Bilirubin');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (8, 20, 10, 'Indirect Bilirubin');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (9, 20, 11, 'ALT/SGPT');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (10, 20, 12, 'AST/SGOT');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (11, 20, 13, 'Gamma GT');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (12, 21, 14, 'Creatinine');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (13, 21, 15, 'Urea');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (14, 21, 16, 'Uric Acid');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (15, 22, 17, 'Calcium');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (16, 22, 18, 'Potassium');
INSERT INTO public.test_panel_analytes (id, panel_id, analyte_id, analyte_name) VALUES (17, 22, 19, 'Sodium');


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 6, true);


--
-- Name: normal_ranges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.normal_ranges_id_seq', 170, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 79, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 17, true);


--
-- Name: test_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.test_catalog_id_seq', 77, true);


--
-- Name: test_panel_analytes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.test_panel_analytes_id_seq', 39, true);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.units_id_seq', 62, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 4Qo5qm62fwi9VxaJ2HYKfJjiC4HReoykRGRHdFfkmN4yilDHHlchhgyoaJRsJek

