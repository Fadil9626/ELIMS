--
-- PostgreSQL database dump
--

\restrict dacee5OumvV9i4nOuGAgJQlGcOlveTFeyomAnLQW2573t0ObO6A0vzwMMhBld4F

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: admission_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.admission_type_enum AS ENUM (
    'OPD',
    'IPD',
    'Emergency'
);


ALTER TYPE public.admission_type_enum OWNER TO postgres;

--
-- Name: gender_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_enum AS ENUM (
    'Any',
    'Male',
    'Female'
);


ALTER TYPE public.gender_enum OWNER TO postgres;

--
-- Name: ingest_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ingest_status AS ENUM (
    'queued',
    'processed',
    'failed',
    'reprocessing'
);


ALTER TYPE public.ingest_status OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_status AS ENUM (
    'pending',
    'paid',
    'cancelled'
);


ALTER TYPE public.invoice_status OWNER TO postgres;

--
-- Name: marital_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.marital_status_enum AS ENUM (
    'Single',
    'Married',
    'Divorced',
    'Widowed',
    'Other'
);


ALTER TYPE public.marital_status_enum OWNER TO postgres;

--
-- Name: patient_gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.patient_gender AS ENUM (
    'Male',
    'Female',
    'Other',
    'Unknown'
);


ALTER TYPE public.patient_gender OWNER TO postgres;

--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'Paid',
    'Unpaid',
    'Partial'
);


ALTER TYPE public.payment_status_enum OWNER TO postgres;

--
-- Name: range_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.range_type_enum AS ENUM (
    'numeric',
    'qualitative'
);


ALTER TYPE public.range_type_enum OWNER TO postgres;

--
-- Name: test_item_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.test_item_status AS ENUM (
    'Pending',
    'InProgress',
    'Completed',
    'Verified',
    'Rejected',
    'SampleCollected',
    'UnderReview',
    'Reopened',
    'Released',
    'Cancelled'
);


ALTER TYPE public.test_item_status OWNER TO postgres;

--
-- Name: test_request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.test_request_status AS ENUM (
    'Pending',
    'SampleCollected',
    'InProgress',
    'Completed',
    'Verified',
    'Cancelled',
    'Released',
    'UnderReview',
    'Reopened',
    'SampleReceived',
    'Processing',
    'Printed'
);


ALTER TYPE public.test_request_status OWNER TO postgres;

--
-- Name: update_sample_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sample_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_sample_timestamp() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analyte_reference_ranges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analyte_reference_ranges (
    id integer NOT NULL,
    analyte_id integer NOT NULL,
    gender character varying(1) NOT NULL,
    min_age integer NOT NULL,
    max_age integer NOT NULL,
    min_value numeric(10,4) NOT NULL,
    max_value numeric(10,4) NOT NULL
);


ALTER TABLE public.analyte_reference_ranges OWNER TO postgres;

--
-- Name: analyte_reference_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analyte_reference_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analyte_reference_ranges_id_seq OWNER TO postgres;

--
-- Name: analyte_reference_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analyte_reference_ranges_id_seq OWNED BY public.analyte_reference_ranges.id;


--
-- Name: analytes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytes (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    unit_id integer,
    department_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.analytes OWNER TO postgres;

--
-- Name: analytes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analytes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytes_id_seq OWNER TO postgres;

--
-- Name: analytes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analytes_id_seq OWNED BY public.analytes.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    key_prefix character varying(32) NOT NULL,
    key_hash text NOT NULL,
    secret_hash text,
    salt character varying(64),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.api_keys ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.api_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    details jsonb,
    entity character varying(100),
    entity_id integer,
    entity_type character varying(50),
    user_name text,
    created_at timestamp with time zone DEFAULT now(),
    module character varying(100),
    severity character varying(20),
    role character varying(100),
    ip_address text,
    user_agent text,
    username text
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.departments ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: instrument_ingest_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instrument_ingest_events (
    id integer NOT NULL,
    key_id integer,
    user_id integer,
    instrument character varying(100) NOT NULL,
    sample_id character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    status public.ingest_status DEFAULT 'queued'::public.ingest_status NOT NULL,
    error_msg text,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);


ALTER TABLE public.instrument_ingest_events OWNER TO postgres;

--
-- Name: instrument_ingest_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.instrument_ingest_events ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.instrument_ingest_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    quantity integer DEFAULT 0 NOT NULL,
    unit character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.inventory_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inventory_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    patient_id integer,
    test_request_id integer,
    amount numeric(10,2) NOT NULL,
    status public.invoice_status DEFAULT 'pending'::public.invoice_status,
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer,
    receiver_id integer,
    content text NOT NULL,
    is_general boolean DEFAULT false NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: mrn_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mrn_settings (
    id integer NOT NULL,
    facility_code character varying(10) DEFAULT 'MTD'::character varying NOT NULL,
    reset_yearly boolean DEFAULT true NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mrn_settings OWNER TO postgres;

--
-- Name: mrn_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.mrn_settings ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.mrn_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: normal_ranges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.normal_ranges (
    id integer NOT NULL,
    analyte_id integer,
    gender public.gender_enum DEFAULT 'Any'::public.gender_enum,
    range_type public.range_type_enum DEFAULT 'numeric'::public.range_type_enum,
    qualitative_value character varying(50),
    symbol_operator character varying(10),
    age_min numeric,
    age_max numeric,
    unit_id integer,
    min_value numeric,
    max_value numeric,
    reference_range_text text,
    min_age integer,
    max_age integer,
    range_label text,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    qualitative_values text[]
);


ALTER TABLE public.normal_ranges OWNER TO postgres;

--
-- Name: normal_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.normal_ranges ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.normal_ranges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    recipient_user_id integer NOT NULL,
    sender_user_id integer,
    title text NOT NULL,
    body text,
    type text DEFAULT 'info'::text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: panel_range_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.panel_range_overrides (
    id integer NOT NULL,
    panel_id integer NOT NULL,
    analyte_id integer NOT NULL,
    override_range jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.panel_range_overrides OWNER TO postgres;

--
-- Name: panel_range_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.panel_range_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.panel_range_overrides_id_seq OWNER TO postgres;

--
-- Name: panel_range_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.panel_range_overrides_id_seq OWNED BY public.panel_range_overrides.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    mrn character varying(50),
    first_name character varying(255) NOT NULL,
    middle_name character varying(255),
    last_name character varying(255) NOT NULL,
    date_of_birth date NOT NULL,
    gender public.patient_gender,
    marital_status public.marital_status_enum,
    occupation character varying(255),
    contact_phone character varying(50),
    contact_address text,
    contact_email character varying(255),
    admission_type public.admission_type_enum DEFAULT 'OPD'::public.admission_type_enum,
    lab_id character varying(50),
    ward_id integer,
    referring_doctor character varying(255),
    emergency_name character varying(255),
    emergency_relationship character varying(100),
    emergency_phone character varying(50),
    registered_by integer,
    registered_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    phone character varying(255),
    address character varying(255) DEFAULT NULL::character varying,
    is_confidential boolean DEFAULT false NOT NULL,
    restricted_doctor_id integer
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.patients ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.patients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(100) NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    slug text GENERATED ALWAYS AS (lower(((resource || ':'::text) || action))) STORED
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: professional_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.professional_profiles (
    user_id integer NOT NULL,
    title text,
    credentials text,
    license_number text,
    license_state text,
    license_expiry date,
    specialization text,
    signature_image_url text,
    show_on_reports boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.professional_profiles OWNER TO postgres;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    core boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    slug character varying(100),
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    container_type character varying(100),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sample_types OWNER TO postgres;

--
-- Name: sample_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.sample_types ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sample_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: samples; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.samples (
    id integer NOT NULL,
    test_request_id integer NOT NULL,
    sample_type_id integer NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying NOT NULL,
    collected_at timestamp without time zone,
    received_at timestamp without time zone,
    collected_by integer,
    received_by integer,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.samples OWNER TO postgres;

--
-- Name: samples_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.samples_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.samples_id_seq OWNER TO postgres;

--
-- Name: samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.samples_id_seq OWNED BY public.samples.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: test_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_catalog (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50),
    price numeric(10,2) DEFAULT 0 NOT NULL,
    department_id integer,
    sample_type_id integer,
    unit_id integer,
    is_panel boolean DEFAULT false,
    is_active boolean DEFAULT true,
    result_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    panel_auto_recalc boolean DEFAULT false NOT NULL,
    qualitative_value text[],
    qualitative_values text[]
);


ALTER TABLE public.test_catalog OWNER TO postgres;

--
-- Name: test_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.test_catalog ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.test_catalog_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: test_panel_analytes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_panel_analytes (
    id integer NOT NULL,
    panel_id integer,
    analyte_id integer,
    analyte_name text NOT NULL
);


ALTER TABLE public.test_panel_analytes OWNER TO postgres;

--
-- Name: test_panel_analytes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.test_panel_analytes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.test_panel_analytes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: test_request_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_request_items (
    id integer NOT NULL,
    test_request_id integer NOT NULL,
    test_catalog_id integer NOT NULL,
    result_value text,
    result_data jsonb,
    status public.test_item_status DEFAULT 'Pending'::public.test_item_status,
    parent_id integer,
    verified_by integer,
    verified_name character varying(255),
    verified_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_by character varying(255) DEFAULT NULL::character varying,
    reviewed_at timestamp with time zone,
    reviewed_by_id integer,
    reviewed_by_name character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.test_request_items OWNER TO postgres;

--
-- Name: test_request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.test_request_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.test_request_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: test_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_requests (
    id integer NOT NULL,
    patient_id integer,
    created_at timestamp with time zone DEFAULT now(),
    status public.test_request_status DEFAULT 'Pending'::public.test_request_status,
    sample_collected_at timestamp with time zone,
    collected_by integer,
    payment_status public.payment_status_enum DEFAULT 'Unpaid'::public.payment_status_enum,
    updated_at timestamp with time zone DEFAULT now(),
    external_sample_id character varying(64),
    created_by integer,
    payment_amount numeric(14,2),
    payment_method text,
    payment_date timestamp with time zone,
    ward_id integer,
    referring_doctor character varying(255),
    visit_id integer,
    priority character varying(20) DEFAULT 'Routine'::character varying
);


ALTER TABLE public.test_requests OWNER TO postgres;

--
-- Name: test_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.test_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.test_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    symbol character varying(20),
    unit_name character varying(100),
    description character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.units ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.units_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_permissions_id_seq OWNER TO postgres;

--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    department_id integer,
    role_id integer,
    department character varying(100),
    profile_image_url text,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    last_seen timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    visit_date timestamp without time zone DEFAULT now() NOT NULL,
    visit_type character varying(50) DEFAULT 'Outpatient'::character varying,
    doctor_name character varying(255),
    status character varying(50) DEFAULT 'Active'::character varying
);


ALTER TABLE public.visits OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.visits_id_seq OWNER TO postgres;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- Name: wards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wards (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    type character varying(50) DEFAULT 'General'::character varying
);


ALTER TABLE public.wards OWNER TO postgres;

--
-- Name: wards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.wards ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.wards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analyte_reference_ranges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyte_reference_ranges ALTER COLUMN id SET DEFAULT nextval('public.analyte_reference_ranges_id_seq'::regclass);


--
-- Name: analytes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes ALTER COLUMN id SET DEFAULT nextval('public.analytes_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: panel_range_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_range_overrides ALTER COLUMN id SET DEFAULT nextval('public.panel_range_overrides_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: samples id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples ALTER COLUMN id SET DEFAULT nextval('public.samples_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- Name: analyte_reference_ranges analyte_reference_ranges_analyte_id_gender_min_age_max_age_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyte_reference_ranges
    ADD CONSTRAINT analyte_reference_ranges_analyte_id_gender_min_age_max_age_key UNIQUE (analyte_id, gender, min_age, max_age);


--
-- Name: analyte_reference_ranges analyte_reference_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyte_reference_ranges
    ADD CONSTRAINT analyte_reference_ranges_pkey PRIMARY KEY (id);


--
-- Name: analytes analytes_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes
    ADD CONSTRAINT analytes_name_key UNIQUE (name);


--
-- Name: analytes analytes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes
    ADD CONSTRAINT analytes_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_prefix_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_prefix_key UNIQUE (key_prefix);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: instrument_ingest_events instrument_ingest_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instrument_ingest_events
    ADD CONSTRAINT instrument_ingest_events_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: mrn_settings mrn_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mrn_settings
    ADD CONSTRAINT mrn_settings_pkey PRIMARY KEY (id);


--
-- Name: normal_ranges normal_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.normal_ranges
    ADD CONSTRAINT normal_ranges_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: panel_range_overrides panel_range_overrides_panel_id_analyte_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_range_overrides
    ADD CONSTRAINT panel_range_overrides_panel_id_analyte_id_key UNIQUE (panel_id, analyte_id);


--
-- Name: panel_range_overrides panel_range_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_range_overrides
    ADD CONSTRAINT panel_range_overrides_pkey PRIMARY KEY (id);


--
-- Name: patients patients_lab_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_lab_id_key UNIQUE (lab_id);


--
-- Name: patients patients_mrn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_mrn_key UNIQUE (mrn);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: professional_profiles professional_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professional_profiles
    ADD CONSTRAINT professional_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: resources resources_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_name_key UNIQUE (name);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sample_types sample_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_types
    ADD CONSTRAINT sample_types_name_key UNIQUE (name);


--
-- Name: sample_types sample_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_types
    ADD CONSTRAINT sample_types_pkey PRIMARY KEY (id);


--
-- Name: samples samples_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT samples_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: test_catalog test_catalog_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_code_key UNIQUE (code);


--
-- Name: test_catalog test_catalog_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_name_key UNIQUE (name);


--
-- Name: test_catalog test_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_pkey PRIMARY KEY (id);


--
-- Name: test_panel_analytes test_panel_analytes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_panel_analytes
    ADD CONSTRAINT test_panel_analytes_pkey PRIMARY KEY (id);


--
-- Name: test_request_items test_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_request_items
    ADD CONSTRAINT test_request_items_pkey PRIMARY KEY (id);


--
-- Name: test_requests test_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_pkey PRIMARY KEY (id);


--
-- Name: normal_ranges unique_analyte_gender; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.normal_ranges
    ADD CONSTRAINT unique_analyte_gender UNIQUE (analyte_id, gender);


--
-- Name: mrn_settings unique_facility_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mrn_settings
    ADD CONSTRAINT unique_facility_code UNIQUE (facility_code);


--
-- Name: test_panel_analytes unique_panel_analyte; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_panel_analytes
    ADD CONSTRAINT unique_panel_analyte UNIQUE (panel_id, analyte_id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: units units_symbol_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_symbol_key UNIQUE (symbol);


--
-- Name: units units_unit_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_unit_name_key UNIQUE (unit_name);


--
-- Name: analytes uq_analyte_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes
    ADD CONSTRAINT uq_analyte_name UNIQUE (name);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_unique UNIQUE (user_id, permission_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: wards wards_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_name_key UNIQUE (name);


--
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_messages_receiver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id, is_read);


--
-- Name: idx_notifications_recipient_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_unread ON public.notifications USING btree (recipient_user_id, is_read);


--
-- Name: idx_patients_mrn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_mrn ON public.patients USING btree (mrn);


--
-- Name: idx_patients_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_name ON public.patients USING btree (first_name, last_name);


--
-- Name: idx_test_request_items_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_request_items_request ON public.test_request_items USING btree (test_request_id);


--
-- Name: idx_test_requests_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_requests_patient ON public.test_requests USING btree (patient_id);


--
-- Name: idx_test_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_requests_status ON public.test_requests USING btree (status);


--
-- Name: samples trg_update_sample_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_sample_timestamp BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE FUNCTION public.update_sample_timestamp();


--
-- Name: analyte_reference_ranges analyte_reference_ranges_analyte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyte_reference_ranges
    ADD CONSTRAINT analyte_reference_ranges_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.analytes(id) ON DELETE CASCADE;


--
-- Name: analytes analytes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes
    ADD CONSTRAINT analytes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: analytes analytes_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytes
    ADD CONSTRAINT analytes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs fk_audit_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: samples fk_sample_type; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT fk_sample_type FOREIGN KEY (sample_type_id) REFERENCES public.sample_types(id);


--
-- Name: samples fk_test_request; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT fk_test_request FOREIGN KEY (test_request_id) REFERENCES public.test_requests(id) ON DELETE CASCADE;


--
-- Name: samples fk_user_collect; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT fk_user_collect FOREIGN KEY (collected_by) REFERENCES public.users(id);


--
-- Name: samples fk_user_receive; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.samples
    ADD CONSTRAINT fk_user_receive FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: users fk_users_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: users fk_users_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: instrument_ingest_events instrument_ingest_events_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instrument_ingest_events
    ADD CONSTRAINT instrument_ingest_events_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;


--
-- Name: instrument_ingest_events instrument_ingest_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instrument_ingest_events
    ADD CONSTRAINT instrument_ingest_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_test_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_test_request_id_fkey FOREIGN KEY (test_request_id) REFERENCES public.test_requests(id) ON DELETE SET NULL;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: normal_ranges normal_ranges_analyte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.normal_ranges
    ADD CONSTRAINT normal_ranges_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.test_catalog(id) ON DELETE CASCADE;


--
-- Name: normal_ranges normal_ranges_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.normal_ranges
    ADD CONSTRAINT normal_ranges_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: panel_range_overrides panel_range_overrides_analyte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_range_overrides
    ADD CONSTRAINT panel_range_overrides_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.test_catalog(id) ON DELETE CASCADE;


--
-- Name: panel_range_overrides panel_range_overrides_panel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.panel_range_overrides
    ADD CONSTRAINT panel_range_overrides_panel_id_fkey FOREIGN KEY (panel_id) REFERENCES public.test_catalog(id) ON DELETE CASCADE;


--
-- Name: patients patients_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: patients patients_restricted_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_restricted_doctor_id_fkey FOREIGN KEY (restricted_doctor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: patients patients_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE SET NULL;


--
-- Name: professional_profiles professional_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professional_profiles
    ADD CONSTRAINT professional_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: test_catalog test_catalog_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: test_catalog test_catalog_sample_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_sample_type_id_fkey FOREIGN KEY (sample_type_id) REFERENCES public.sample_types(id) ON DELETE SET NULL;


--
-- Name: test_catalog test_catalog_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_catalog
    ADD CONSTRAINT test_catalog_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: test_panel_analytes test_panel_analytes_analyte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_panel_analytes
    ADD CONSTRAINT test_panel_analytes_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.test_catalog(id) ON DELETE CASCADE;


--
-- Name: test_panel_analytes test_panel_analytes_panel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_panel_analytes
    ADD CONSTRAINT test_panel_analytes_panel_id_fkey FOREIGN KEY (panel_id) REFERENCES public.test_catalog(id) ON DELETE CASCADE;


--
-- Name: test_request_items test_request_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_request_items
    ADD CONSTRAINT test_request_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.test_request_items(id) ON DELETE CASCADE;


--
-- Name: test_request_items test_request_items_test_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_request_items
    ADD CONSTRAINT test_request_items_test_catalog_id_fkey FOREIGN KEY (test_catalog_id) REFERENCES public.test_catalog(id) ON DELETE RESTRICT;


--
-- Name: test_request_items test_request_items_test_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_request_items
    ADD CONSTRAINT test_request_items_test_request_id_fkey FOREIGN KEY (test_request_id) REFERENCES public.test_requests(id) ON DELETE CASCADE;


--
-- Name: test_request_items test_request_items_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_request_items
    ADD CONSTRAINT test_request_items_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: test_requests test_requests_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: test_requests test_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: test_requests test_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: test_requests test_requests_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: test_requests test_requests_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_requests
    ADD CONSTRAINT test_requests_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE SET NULL;


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dacee5OumvV9i4nOuGAgJQlGcOlveTFeyomAnLQW2573t0ObO6A0vzwMMhBld4F

