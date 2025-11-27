--
-- PostgreSQL database dump
--

\restrict Jgmeo0W4fct7rj77EY5RniSrhlTbeZi6mKzImMcbvndwh4Gu7hVHFIgxQqty5fu

-- Dumped from database version 13.22
-- Dumped by pg_dump version 17.6

-- Started on 2025-11-24 15:25:24

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 670 (class 1247 OID 88562)
-- Name: activity_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_type_enum AS ENUM (
    'call',
    'message',
    'meeting',
    'note',
    'task'
);


ALTER TYPE public.activity_type_enum OWNER TO postgres;

--
-- TOC entry 679 (class 1247 OID 88588)
-- Name: files_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.files_type_enum AS ENUM (
    'image',
    'document',
    'other'
);


ALTER TYPE public.files_type_enum OWNER TO postgres;

--
-- TOC entry 688 (class 1247 OID 88612)
-- Name: integration_provider_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.integration_provider_enum AS ENUM (
    'meta',
    'tiktok',
    'wordpress',
    'google_ads',
    'custom'
);


ALTER TYPE public.integration_provider_enum OWNER TO postgres;

--
-- TOC entry 783 (class 1247 OID 103317)
-- Name: integration_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.integration_status_enum AS ENUM (
    'active',
    'inactive',
    'error',
    'testing',
    'connected',
    'disconnected'
);


ALTER TYPE public.integration_status_enum OWNER TO postgres;

--
-- TOC entry 667 (class 1247 OID 88531)
-- Name: lead_source_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lead_source_enum AS ENUM (
    'manual',
    'meta',
    'tiktok',
    'google_ads',
    'landing_page',
    'wordpress',
    'api'
);


ALTER TYPE public.lead_source_enum OWNER TO postgres;

--
-- TOC entry 796 (class 1247 OID 111388)
-- Name: lead_touchpoint_event_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.lead_touchpoint_event_type_enum AS ENUM (
    'view',
    'submit'
);


ALTER TYPE public.lead_touchpoint_event_type_enum OWNER TO postgres;

--
-- TOC entry 769 (class 1247 OID 103178)
-- Name: leads_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.leads_status_enum AS ENUM (
    'new',
    'in_progress',
    'follow_up',
    'not_answering',
    'closed',
    'won',
    'lost'
);


ALTER TYPE public.leads_status_enum OWNER TO postgres;

--
-- TOC entry 682 (class 1247 OID 88596)
-- Name: meetings_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.meetings_status_enum AS ENUM (
    'scheduled',
    'done',
    'cancelled'
);


ALTER TYPE public.meetings_status_enum OWNER TO postgres;

--
-- TOC entry 673 (class 1247 OID 88572)
-- Name: messages_channel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.messages_channel_enum AS ENUM (
    'whatsapp',
    'sms',
    'email',
    'call'
);


ALTER TYPE public.messages_channel_enum OWNER TO postgres;

--
-- TOC entry 676 (class 1247 OID 88582)
-- Name: messages_direction_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.messages_direction_enum AS ENUM (
    'incoming',
    'outgoing'
);


ALTER TYPE public.messages_direction_enum OWNER TO postgres;

--
-- TOC entry 685 (class 1247 OID 88604)
-- Name: price_offer_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.price_offer_status_enum AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE public.price_offer_status_enum OWNER TO postgres;

--
-- TOC entry 244 (class 1255 OID 111313)
-- Name: update_integration_leads_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_integration_leads_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.website_id IS NOT NULL THEN
      UPDATE integrations SET leads_count = leads_count + 1
      WHERE id = NEW.website_id;
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF OLD.website_id IS DISTINCT FROM NEW.website_id THEN
      UPDATE integrations SET leads_count = GREATEST(leads_count - 1, 0)
      WHERE id = OLD.website_id;

      UPDATE integrations SET leads_count = leads_count + 1
      WHERE id = NEW.website_id;
    END IF;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF OLD.website_id IS NOT NULL THEN
      UPDATE integrations SET leads_count = GREATEST(leads_count - 1, 0)
      WHERE id = OLD.website_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_integration_leads_count() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 213 (class 1259 OID 88749)
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    lead_id integer,
    user_id integer,
    type public.activity_type_enum NOT NULL,
    content text,
    due_at timestamp without time zone,
    done_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    task_priority character varying(20) DEFAULT 'medium'::character varying,
    is_task_completed boolean DEFAULT false,
    task_completed_at timestamp without time zone,
    priority character varying(20) DEFAULT 'medium'::character varying,
    completed boolean DEFAULT false,
    completed_at timestamp without time zone
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- TOC entry 212 (class 1259 OID 88747)
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO postgres;

--
-- TOC entry 3369 (class 0 OID 0)
-- Dependencies: 212
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- TOC entry 205 (class 1259 OID 88658)
-- Name: ad_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_sources (
    id integer NOT NULL,
    channel character varying NOT NULL,
    account_id character varying NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.ad_sources OWNER TO postgres;

--
-- TOC entry 204 (class 1259 OID 88656)
-- Name: ad_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_sources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_sources_id_seq OWNER TO postgres;

--
-- TOC entry 3370 (class 0 OID 0)
-- Dependencies: 204
-- Name: ad_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_sources_id_seq OWNED BY public.ad_sources.id;


--
-- TOC entry 239 (class 1259 OID 111371)
-- Name: ad_spend; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_spend (
    id integer NOT NULL,
    campaign_id integer,
    date date NOT NULL,
    spend numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ad_spend OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 111369)
-- Name: ad_spend_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ad_spend_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ad_spend_id_seq OWNER TO postgres;

--
-- TOC entry 3371 (class 0 OID 0)
-- Dependencies: 238
-- Name: ad_spend_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ad_spend_id_seq OWNED BY public.ad_spend.id;


--
-- TOC entry 243 (class 1259 OID 111427)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 111425)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 3372 (class 0 OID 0)
-- Dependencies: 242
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- TOC entry 207 (class 1259 OID 88669)
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    country character varying,
    ad_source_id integer,
    created_by integer,
    platform_campaign_id character varying,
    active boolean DEFAULT true,
    budget numeric(10,2) DEFAULT 0,
    cost_per_lead numeric(10,2) DEFAULT 0,
    lead_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- TOC entry 206 (class 1259 OID 88667)
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO postgres;

--
-- TOC entry 3373 (class 0 OID 0)
-- Dependencies: 206
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- TOC entry 223 (class 1259 OID 88839)
-- Name: deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deals (
    id integer NOT NULL,
    lead_id integer,
    pipeline_id integer,
    stage_id integer,
    amount numeric(10,2),
    currency character varying,
    expected_close_date date,
    won boolean DEFAULT false,
    lost_reason character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    closed_at timestamp without time zone
);


ALTER TABLE public.deals OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 88837)
-- Name: deals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deals_id_seq OWNER TO postgres;

--
-- TOC entry 3374 (class 0 OID 0)
-- Dependencies: 222
-- Name: deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deals_id_seq OWNED BY public.deals.id;


--
-- TOC entry 217 (class 1259 OID 88788)
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id integer NOT NULL,
    lead_id integer,
    uploaded_by integer,
    name character varying NOT NULL,
    url character varying NOT NULL,
    size character varying,
    mime_type character varying,
    type public.files_type_enum DEFAULT 'other'::public.files_type_enum,
    uploaded_at timestamp without time zone DEFAULT now(),
    file_path character varying(500),
    original_name character varying(255),
    file_extension character varying(10),
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone
);


ALTER TABLE public.files OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 88786)
-- Name: files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.files_id_seq OWNER TO postgres;

--
-- TOC entry 3375 (class 0 OID 0)
-- Dependencies: 216
-- Name: files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.files_id_seq OWNED BY public.files.id;


--
-- TOC entry 229 (class 1259 OID 88915)
-- Name: integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integrations (
    id integer NOT NULL,
    provider character varying(50) NOT NULL,
    name character varying,
    slug character varying,
    access_token character varying,
    refresh_token character varying,
    expires_at timestamp without time zone,
    page_id character varying,
    page_name character varying,
    account_id character varying,
    webhook_url character varying,
    webhook_config jsonb,
    extra jsonb,
    connected_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    user_id integer,
    endpoint_url text,
    api_key text,
    type character varying(50),
    url text,
    status public.integration_status_enum DEFAULT 'active'::public.integration_status_enum,
    leads_count integer DEFAULT 0
);


ALTER TABLE public.integrations OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 88913)
-- Name: integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integrations_id_seq OWNER TO postgres;

--
-- TOC entry 3376 (class 0 OID 0)
-- Dependencies: 228
-- Name: integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integrations_id_seq OWNED BY public.integrations.id;


--
-- TOC entry 237 (class 1259 OID 111345)
-- Name: landing_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landing_pages (
    id integer NOT NULL,
    title character varying NOT NULL,
    slug character varying,
    content text,
    template character varying,
    settings jsonb DEFAULT '{}'::jsonb,
    sections jsonb DEFAULT '[]'::jsonb,
    active boolean DEFAULT true,
    description character varying,
    campaign_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.landing_pages OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 111343)
-- Name: landing_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.landing_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.landing_pages_id_seq OWNER TO postgres;

--
-- TOC entry 3377 (class 0 OID 0)
-- Dependencies: 236
-- Name: landing_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.landing_pages_id_seq OWNED BY public.landing_pages.id;


--
-- TOC entry 211 (class 1259 OID 88727)
-- Name: lead_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_notes (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    user_id integer,
    note text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lead_notes OWNER TO postgres;

--
-- TOC entry 210 (class 1259 OID 88725)
-- Name: lead_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_notes_id_seq OWNER TO postgres;

--
-- TOC entry 3378 (class 0 OID 0)
-- Dependencies: 210
-- Name: lead_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_notes_id_seq OWNED BY public.lead_notes.id;


--
-- TOC entry 241 (class 1259 OID 111399)
-- Name: lead_touchpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_touchpoints (
    id integer NOT NULL,
    lead_id integer,
    campaign_id integer,
    event_type public.lead_touchpoint_event_type_enum NOT NULL,
    campaign_name character varying(255),
    ip_address character varying(45),
    country character varying(100),
    user_agent text,
    additional_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_touchpoints OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 111397)
-- Name: lead_touchpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_touchpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_touchpoints_id_seq OWNER TO postgres;

--
-- TOC entry 3379 (class 0 OID 0)
-- Dependencies: 240
-- Name: lead_touchpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_touchpoints_id_seq OWNED BY public.lead_touchpoints.id;


--
-- TOC entry 209 (class 1259 OID 88695)
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    full_name character varying NOT NULL,
    phone character varying,
    email character varying,
    country character varying,
    city character varying,
    language character varying,
    source public.lead_source_enum DEFAULT 'manual'::public.lead_source_enum,
    campaign_id integer,
    owner_user_id integer,
    assigned_to integer,
    utm_source character varying,
    utm_medium character varying,
    utm_campaign character varying,
    utm_term character varying,
    utm_content character varying,
    external_lead_id character varying,
    source_reference_id character varying,
    advertiser_id character varying,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    raw_payload jsonb DEFAULT '{}'::jsonb,
    original_created_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    status public.leads_status_enum,
    substatus character varying(255),
    last_email_sent_at timestamp without time zone,
    email_count integer DEFAULT 0,
    last_email_opened_at timestamp without time zone,
    website_id integer
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- TOC entry 208 (class 1259 OID 88693)
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leads_id_seq OWNER TO postgres;

--
-- TOC entry 3380 (class 0 OID 0)
-- Dependencies: 208
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- TOC entry 225 (class 1259 OID 88866)
-- Name: meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meetings (
    id integer NOT NULL,
    lead_id integer,
    title character varying NOT NULL,
    date timestamp without time zone NOT NULL,
    duration integer DEFAULT 30,
    location character varying,
    participants text,
    notes text,
    status public.meetings_status_enum DEFAULT 'scheduled'::public.meetings_status_enum,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    meeting_link character varying(500),
    reminder_sent boolean DEFAULT false
);


ALTER TABLE public.meetings OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 88864)
-- Name: meetings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meetings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meetings_id_seq OWNER TO postgres;

--
-- TOC entry 3381 (class 0 OID 0)
-- Dependencies: 224
-- Name: meetings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meetings_id_seq OWNED BY public.meetings.id;


--
-- TOC entry 215 (class 1259 OID 88771)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    lead_id integer,
    channel public.messages_channel_enum NOT NULL,
    direction public.messages_direction_enum NOT NULL,
    body text NOT NULL,
    external_id character varying,
    "timestamp" timestamp without time zone DEFAULT now(),
    email_subject character varying(500),
    email_from character varying(255),
    email_to text,
    email_cc text,
    email_bcc text,
    email_reply_to character varying(255),
    is_email_opened boolean DEFAULT false,
    email_opened_at timestamp without time zone,
    email_open_count integer DEFAULT 0,
    is_email_clicked boolean DEFAULT false,
    email_clicked_at timestamp without time zone,
    email_click_count integer DEFAULT 0,
    email_message_id character varying(255),
    email_in_reply_to character varying(255),
    email_references text,
    subject character varying(500),
    from_email character varying(255),
    to_email character varying(255),
    cc_emails text,
    bcc_emails text,
    attachments jsonb,
    email_status character varying(50),
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    bounced_at timestamp without time zone,
    error_message text
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 88769)
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
-- TOC entry 3382 (class 0 OID 0)
-- Dependencies: 214
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 231 (class 1259 OID 88934)
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 88932)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- TOC entry 3383 (class 0 OID 0)
-- Dependencies: 230
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 219 (class 1259 OID 88812)
-- Name: pipelines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pipelines (
    id integer NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.pipelines OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 88810)
-- Name: pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipelines_id_seq OWNER TO postgres;

--
-- TOC entry 3384 (class 0 OID 0)
-- Dependencies: 218
-- Name: pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pipelines_id_seq OWNED BY public.pipelines.id;


--
-- TOC entry 227 (class 1259 OID 88890)
-- Name: price_offers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_offers (
    id integer NOT NULL,
    lead_id integer,
    title character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'USD'::character varying,
    description text,
    valid_until date,
    status public.price_offer_status_enum DEFAULT 'pending'::public.price_offer_status_enum,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.price_offers OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 88888)
-- Name: price_offers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_offers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_offers_id_seq OWNER TO postgres;

--
-- TOC entry 3385 (class 0 OID 0)
-- Dependencies: 226
-- Name: price_offers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_offers_id_seq OWNED BY public.price_offers.id;


--
-- TOC entry 221 (class 1259 OID 88823)
-- Name: stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stages (
    id integer NOT NULL,
    pipeline_id integer,
    name character varying NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE public.stages OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 88821)
-- Name: stages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stages_id_seq OWNER TO postgres;

--
-- TOC entry 3386 (class 0 OID 0)
-- Dependencies: 220
-- Name: stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stages_id_seq OWNED BY public.stages.id;


--
-- TOC entry 201 (class 1259 OID 88625)
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- TOC entry 200 (class 1259 OID 88623)
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO postgres;

--
-- TOC entry 3387 (class 0 OID 0)
-- Dependencies: 200
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- TOC entry 235 (class 1259 OID 103294)
-- Name: tiktok_integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tiktok_integrations (
    id integer NOT NULL,
    access_token character varying,
    refresh_token character varying,
    expires_at timestamp without time zone,
    user_id integer,
    advertiser_ids jsonb,
    app_id character varying,
    secret character varying,
    active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tiktok_integrations OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 103292)
-- Name: tiktok_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiktok_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tiktok_integrations_id_seq OWNER TO postgres;

--
-- TOC entry 3388 (class 0 OID 0)
-- Dependencies: 234
-- Name: tiktok_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiktok_integrations_id_seq OWNED BY public.tiktok_integrations.id;


--
-- TOC entry 233 (class 1259 OID 103267)
-- Name: twilio_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.twilio_settings (
    id integer NOT NULL,
    account_sid character varying(255) NOT NULL,
    auth_token character varying(255) NOT NULL,
    phone_number character varying(20) NOT NULL,
    webhook_url character varying(500),
    active boolean DEFAULT false,
    user_id integer NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.twilio_settings OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 103265)
-- Name: twilio_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.twilio_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.twilio_settings_id_seq OWNER TO postgres;

--
-- TOC entry 3389 (class 0 OID 0)
-- Dependencies: 232
-- Name: twilio_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.twilio_settings_id_seq OWNED BY public.twilio_settings.id;


--
-- TOC entry 203 (class 1259 OID 88637)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    role character varying DEFAULT 'sales'::character varying NOT NULL,
    team_id integer,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 202 (class 1259 OID 88635)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 3390 (class 0 OID 0)
-- Dependencies: 202
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3053 (class 2604 OID 88752)
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- TOC entry 3037 (class 2604 OID 88661)
-- Name: ad_sources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_sources ALTER COLUMN id SET DEFAULT nextval('public.ad_sources_id_seq'::regclass);


--
-- TOC entry 3105 (class 2604 OID 111374)
-- Name: ad_spend id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend ALTER COLUMN id SET DEFAULT nextval('public.ad_spend_id_seq'::regclass);


--
-- TOC entry 3111 (class 2604 OID 111430)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 3038 (class 2604 OID 88672)
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- TOC entry 3071 (class 2604 OID 88842)
-- Name: deals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals ALTER COLUMN id SET DEFAULT nextval('public.deals_id_seq'::regclass);


--
-- TOC entry 3065 (class 2604 OID 88791)
-- Name: files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files ALTER COLUMN id SET DEFAULT nextval('public.files_id_seq'::regclass);


--
-- TOC entry 3086 (class 2604 OID 88918)
-- Name: integrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations ALTER COLUMN id SET DEFAULT nextval('public.integrations_id_seq'::regclass);


--
-- TOC entry 3099 (class 2604 OID 111348)
-- Name: landing_pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_pages ALTER COLUMN id SET DEFAULT nextval('public.landing_pages_id_seq'::regclass);


--
-- TOC entry 3051 (class 2604 OID 88730)
-- Name: lead_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_notes ALTER COLUMN id SET DEFAULT nextval('public.lead_notes_id_seq'::regclass);


--
-- TOC entry 3109 (class 2604 OID 111402)
-- Name: lead_touchpoints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_touchpoints ALTER COLUMN id SET DEFAULT nextval('public.lead_touchpoints_id_seq'::regclass);


--
-- TOC entry 3044 (class 2604 OID 88698)
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- TOC entry 3075 (class 2604 OID 88869)
-- Name: meetings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings ALTER COLUMN id SET DEFAULT nextval('public.meetings_id_seq'::regclass);


--
-- TOC entry 3059 (class 2604 OID 88774)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 3090 (class 2604 OID 88937)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 3069 (class 2604 OID 88815)
-- Name: pipelines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pipelines ALTER COLUMN id SET DEFAULT nextval('public.pipelines_id_seq'::regclass);


--
-- TOC entry 3081 (class 2604 OID 88893)
-- Name: price_offers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_offers ALTER COLUMN id SET DEFAULT nextval('public.price_offers_id_seq'::regclass);


--
-- TOC entry 3070 (class 2604 OID 88826)
-- Name: stages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages ALTER COLUMN id SET DEFAULT nextval('public.stages_id_seq'::regclass);


--
-- TOC entry 3031 (class 2604 OID 88628)
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- TOC entry 3095 (class 2604 OID 103297)
-- Name: tiktok_integrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_integrations ALTER COLUMN id SET DEFAULT nextval('public.tiktok_integrations_id_seq'::regclass);


--
-- TOC entry 3091 (class 2604 OID 103270)
-- Name: twilio_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_settings ALTER COLUMN id SET DEFAULT nextval('public.twilio_settings_id_seq'::regclass);


--
-- TOC entry 3033 (class 2604 OID 88640)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3168 (class 2606 OID 88942)
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- TOC entry 3132 (class 2606 OID 88758)
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- TOC entry 3120 (class 2606 OID 88666)
-- Name: ad_sources ad_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_sources
    ADD CONSTRAINT ad_sources_pkey PRIMARY KEY (id);


--
-- TOC entry 3183 (class 2606 OID 111379)
-- Name: ad_spend ad_spend_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend
    ADD CONSTRAINT ad_spend_pkey PRIMARY KEY (id);


--
-- TOC entry 3195 (class 2606 OID 111436)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3122 (class 2606 OID 88682)
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- TOC entry 3153 (class 2606 OID 88848)
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- TOC entry 3144 (class 2606 OID 88798)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- TOC entry 3164 (class 2606 OID 88924)
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3166 (class 2606 OID 88926)
-- Name: integrations integrations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_slug_key UNIQUE (slug);


--
-- TOC entry 3181 (class 2606 OID 111358)
-- Name: landing_pages landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_pkey PRIMARY KEY (id);


--
-- TOC entry 3130 (class 2606 OID 88736)
-- Name: lead_notes lead_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_pkey PRIMARY KEY (id);


--
-- TOC entry 3193 (class 2606 OID 111408)
-- Name: lead_touchpoints lead_touchpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_touchpoints
    ADD CONSTRAINT lead_touchpoints_pkey PRIMARY KEY (id);


--
-- TOC entry 3128 (class 2606 OID 88709)
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- TOC entry 3158 (class 2606 OID 88877)
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- TOC entry 3142 (class 2606 OID 88780)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3149 (class 2606 OID 88820)
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- TOC entry 3160 (class 2606 OID 88902)
-- Name: price_offers price_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_offers
    ADD CONSTRAINT price_offers_pkey PRIMARY KEY (id);


--
-- TOC entry 3151 (class 2606 OID 88831)
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- TOC entry 3114 (class 2606 OID 88634)
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- TOC entry 3175 (class 2606 OID 103305)
-- Name: tiktok_integrations tiktok_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_integrations
    ADD CONSTRAINT tiktok_integrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3173 (class 2606 OID 103278)
-- Name: twilio_settings twilio_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_settings
    ADD CONSTRAINT twilio_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3116 (class 2606 OID 88650)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3118 (class 2606 OID 88648)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3133 (class 1259 OID 103238)
-- Name: idx_activities_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_completed ON public.activities USING btree (completed);


--
-- TOC entry 3134 (class 1259 OID 103261)
-- Name: idx_activities_lead_completed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_lead_completed ON public.activities USING btree (lead_id, completed);


--
-- TOC entry 3135 (class 1259 OID 103237)
-- Name: idx_activities_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_priority ON public.activities USING btree (priority);


--
-- TOC entry 3136 (class 1259 OID 103232)
-- Name: idx_activities_task_completion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activities_task_completion ON public.activities USING btree (is_task_completed, due_at);


--
-- TOC entry 3184 (class 1259 OID 111424)
-- Name: idx_ad_spend_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_campaign ON public.ad_spend USING btree (campaign_id);


--
-- TOC entry 3185 (class 1259 OID 111385)
-- Name: idx_ad_spend_campaign_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_campaign_date ON public.ad_spend USING btree (campaign_id, date);


--
-- TOC entry 3186 (class 1259 OID 111386)
-- Name: idx_ad_spend_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_date ON public.ad_spend USING btree (date);


--
-- TOC entry 3196 (class 1259 OID 111444)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- TOC entry 3197 (class 1259 OID 111443)
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- TOC entry 3198 (class 1259 OID 111442)
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- TOC entry 3154 (class 1259 OID 103234)
-- Name: idx_deals_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deals_created ON public.deals USING btree (created_at);


--
-- TOC entry 3155 (class 1259 OID 103262)
-- Name: idx_deals_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deals_lead ON public.deals USING btree (lead_id);


--
-- TOC entry 3145 (class 1259 OID 103229)
-- Name: idx_files_file_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_file_path ON public.files USING btree (file_path);


--
-- TOC entry 3146 (class 1259 OID 103230)
-- Name: idx_files_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_is_deleted ON public.files USING btree (is_deleted);


--
-- TOC entry 3147 (class 1259 OID 103260)
-- Name: idx_files_lead_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_lead_deleted ON public.files USING btree (lead_id, is_deleted);


--
-- TOC entry 3161 (class 1259 OID 111311)
-- Name: idx_integrations_external_website; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integrations_external_website ON public.integrations USING btree (type) WHERE ((type)::text = 'external_website'::text);


--
-- TOC entry 3162 (class 1259 OID 111312)
-- Name: idx_integrations_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_integrations_provider ON public.integrations USING btree (provider);


--
-- TOC entry 3176 (class 1259 OID 111395)
-- Name: idx_landing_pages_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_pages_active ON public.landing_pages USING btree (active);


--
-- TOC entry 3177 (class 1259 OID 111394)
-- Name: idx_landing_pages_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_pages_campaign ON public.landing_pages USING btree (campaign_id);


--
-- TOC entry 3178 (class 1259 OID 111396)
-- Name: idx_landing_pages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_pages_created_at ON public.landing_pages USING btree (created_at DESC);


--
-- TOC entry 3179 (class 1259 OID 111393)
-- Name: idx_landing_pages_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_landing_pages_slug ON public.landing_pages USING btree (slug);


--
-- TOC entry 3187 (class 1259 OID 111420)
-- Name: idx_lead_touchpoints_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_touchpoints_campaign ON public.lead_touchpoints USING btree (campaign_id);


--
-- TOC entry 3188 (class 1259 OID 111423)
-- Name: idx_lead_touchpoints_campaign_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_touchpoints_campaign_event ON public.lead_touchpoints USING btree (campaign_id, event_type);


--
-- TOC entry 3189 (class 1259 OID 111422)
-- Name: idx_lead_touchpoints_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_touchpoints_created_at ON public.lead_touchpoints USING btree (created_at DESC);


--
-- TOC entry 3190 (class 1259 OID 111421)
-- Name: idx_lead_touchpoints_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_touchpoints_event_type ON public.lead_touchpoints USING btree (event_type);


--
-- TOC entry 3191 (class 1259 OID 111419)
-- Name: idx_lead_touchpoints_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_touchpoints_lead ON public.lead_touchpoints USING btree (lead_id);


--
-- TOC entry 3123 (class 1259 OID 103263)
-- Name: idx_leads_email_tracking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_email_tracking ON public.leads USING btree (last_email_sent_at DESC) WHERE (last_email_sent_at IS NOT NULL);


--
-- TOC entry 3124 (class 1259 OID 103228)
-- Name: idx_leads_last_email_sent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_last_email_sent ON public.leads USING btree (last_email_sent_at);


--
-- TOC entry 3125 (class 1259 OID 103227)
-- Name: idx_leads_substatus; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_substatus ON public.leads USING btree (substatus);


--
-- TOC entry 3126 (class 1259 OID 103336)
-- Name: idx_leads_website_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_website_created ON public.leads USING btree (website_id, created_at);


--
-- TOC entry 3156 (class 1259 OID 103233)
-- Name: idx_meetings_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meetings_updated ON public.meetings USING btree (updated_at);


--
-- TOC entry 3137 (class 1259 OID 103259)
-- Name: idx_messages_email_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_email_status ON public.messages USING btree (email_status) WHERE (email_status IS NOT NULL);


--
-- TOC entry 3138 (class 1259 OID 103231)
-- Name: idx_messages_email_tracking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_email_tracking ON public.messages USING btree (email_message_id, is_email_opened);


--
-- TOC entry 3139 (class 1259 OID 103257)
-- Name: idx_messages_lead_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_lead_channel ON public.messages USING btree (lead_id, channel);


--
-- TOC entry 3140 (class 1259 OID 103258)
-- Name: idx_messages_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_timestamp ON public.messages USING btree ("timestamp" DESC);


--
-- TOC entry 3169 (class 1259 OID 103290)
-- Name: idx_twilio_settings_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_twilio_settings_active ON public.twilio_settings USING btree (active);


--
-- TOC entry 3170 (class 1259 OID 103291)
-- Name: idx_twilio_settings_phone_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_twilio_settings_phone_number ON public.twilio_settings USING btree (phone_number);


--
-- TOC entry 3171 (class 1259 OID 103289)
-- Name: idx_twilio_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_twilio_settings_user_id ON public.twilio_settings USING btree (user_id);


--
-- TOC entry 3232 (class 2620 OID 111314)
-- Name: leads trigger_update_integration_leads_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_integration_leads_count AFTER INSERT OR DELETE OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_integration_leads_count();


--
-- TOC entry 3208 (class 2606 OID 88759)
-- Name: activities activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 3209 (class 2606 OID 88764)
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3200 (class 2606 OID 88683)
-- Name: campaigns campaigns_ad_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_ad_source_id_fkey FOREIGN KEY (ad_source_id) REFERENCES public.ad_sources(id) ON DELETE SET NULL;


--
-- TOC entry 3201 (class 2606 OID 88688)
-- Name: campaigns campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3214 (class 2606 OID 88849)
-- Name: deals deals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- TOC entry 3215 (class 2606 OID 88854)
-- Name: deals deals_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE SET NULL;


--
-- TOC entry 3216 (class 2606 OID 88859)
-- Name: deals deals_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE SET NULL;


--
-- TOC entry 3211 (class 2606 OID 88799)
-- Name: files files_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 3212 (class 2606 OID 88804)
-- Name: files files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3228 (class 2606 OID 111380)
-- Name: ad_spend fk_ad_spend_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend
    ADD CONSTRAINT fk_ad_spend_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- TOC entry 3231 (class 2606 OID 111437)
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3229 (class 2606 OID 111414)
-- Name: lead_touchpoints fk_lead_touchpoints_campaign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_touchpoints
    ADD CONSTRAINT fk_lead_touchpoints_campaign FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- TOC entry 3230 (class 2606 OID 111409)
-- Name: lead_touchpoints fk_lead_touchpoints_lead; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_touchpoints
    ADD CONSTRAINT fk_lead_touchpoints_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- TOC entry 3202 (class 2606 OID 103331)
-- Name: leads fk_leads_website; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT fk_leads_website FOREIGN KEY (website_id) REFERENCES public.integrations(id) ON DELETE SET NULL;


--
-- TOC entry 3225 (class 2606 OID 103306)
-- Name: tiktok_integrations fk_tiktok_integrations_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_integrations
    ADD CONSTRAINT fk_tiktok_integrations_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3223 (class 2606 OID 103284)
-- Name: twilio_settings fk_twilio_settings_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_settings
    ADD CONSTRAINT fk_twilio_settings_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3224 (class 2606 OID 103279)
-- Name: twilio_settings fk_twilio_settings_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.twilio_settings
    ADD CONSTRAINT fk_twilio_settings_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3221 (class 2606 OID 88927)
-- Name: integrations integrations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3222 (class 2606 OID 103311)
-- Name: integrations integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3226 (class 2606 OID 111359)
-- Name: landing_pages landing_pages_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- TOC entry 3227 (class 2606 OID 111364)
-- Name: landing_pages landing_pages_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3206 (class 2606 OID 88737)
-- Name: lead_notes lead_notes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 3207 (class 2606 OID 88742)
-- Name: lead_notes lead_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3203 (class 2606 OID 88720)
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3204 (class 2606 OID 88710)
-- Name: leads leads_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- TOC entry 3205 (class 2606 OID 88715)
-- Name: leads leads_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3217 (class 2606 OID 88883)
-- Name: meetings meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3218 (class 2606 OID 88878)
-- Name: meetings meetings_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 3210 (class 2606 OID 88781)
-- Name: messages messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- TOC entry 3219 (class 2606 OID 88908)
-- Name: price_offers price_offers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_offers
    ADD CONSTRAINT price_offers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 3220 (class 2606 OID 88903)
-- Name: price_offers price_offers_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_offers
    ADD CONSTRAINT price_offers_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- TOC entry 3213 (class 2606 OID 88832)
-- Name: stages stages_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;


--
-- TOC entry 3199 (class 2606 OID 88651)
-- Name: users users_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 3368 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2025-11-24 15:25:25

--
-- PostgreSQL database dump complete
--
COPY public.users (id, name, email, password_hash, role, team_id, active, created_at) FROM stdin;
1	Admin User	admin@crm.com	$2b$10$mzBxAdixB49GJxypNrjeNuzzrED.rJgzrYof2KSacUZ0cPiG4zBU.	admin	\N	t	2025-11-22 00:50:35.473247
\.

\unrestrict Jgmeo0W4fct7rj77EY5RniSrhlTbeZi6mKzImMcbvndwh4Gu7hVHFIgxQqty5fu

