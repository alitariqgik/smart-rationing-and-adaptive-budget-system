--
-- PostgreSQL database dump
--

\restrict qWnVXvvHIUgxka7htt14sQr3kxHNgBaPpaH0XOScu5OrHdZdNzVqYBUQBMKJTRa

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: accept_recommendation(integer, integer, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.accept_recommendation(IN u_id integer, IN old_p_id integer, IN new_p_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 1. Swap the item in the cart
    UPDATE shopping_lists 
    SET product_id = new_p_id 
    WHERE user_id = u_id AND product_id = old_p_id;

    -- 2. Log that this recommendation worked
    INSERT INTO recommendations (user_id, original_product_id, recommended_product_id, status)
    VALUES (u_id, old_p_id, new_p_id, 'accepted');
END;
$$;


ALTER PROCEDURE public.accept_recommendation(IN u_id integer, IN old_p_id integer, IN new_p_id integer) OWNER TO postgres;

--
-- Name: get_recommendations(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_recommendations(input_user_id integer) RETURNS TABLE(original_product_id integer, recommended_product_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 1. Clear out old 'pending' recs so we can recalculate
    DELETE FROM recommendations 
    WHERE user_id = input_user_id 
    AND status = 'pending';

    -- 2. Insert new potential recommendations
    INSERT INTO recommendations (user_id, original_product_id, recommended_product_id, status)
    SELECT DISTINCT ON (sl.product_id)
        sl.user_id,
        sl.product_id,
        p_alt.id,
        'pending'
    FROM shopping_lists sl
    JOIN products p_orig ON sl.product_id = p_orig.id
    JOIN products p_alt ON p_orig.category_id = p_alt.category_id
    WHERE sl.user_id = input_user_id  -- Use the variable name from the header
      AND p_alt.id <> p_orig.id
      AND p_alt.nutrition_score < p_orig.nutrition_score
      -- KEYWORD MATCH (Onion for Onion)
      AND (
          split_part(p_orig.name, ' ', 1) ILIKE split_part(p_alt.name, ' ', 1) 
          OR p_alt.name ILIKE '%' || split_part(p_orig.name, ' ', 1) || '%'
      )
      -- DONT SUGGEST REJECTED ITEMS
      AND NOT EXISTS (
          SELECT 1 FROM recommendations r_old 
          WHERE r_old.user_id = input_user_id 
            AND r_old.recommended_product_id = p_alt.id
            AND r_old.status = 'rejected'
      )
    ORDER BY sl.product_id, p_alt.nutrition_score ASC;

    -- 3. Return the pending results for the UI
    RETURN QUERY 
    SELECT r.original_product_id, r.recommended_product_id
    FROM recommendations r
    WHERE r.user_id = input_user_id AND r.status = 'pending';
END;
$$;


ALTER FUNCTION public.get_recommendations(input_user_id integer) OWNER TO postgres;

--
-- Name: reject_recommendation(integer, integer, integer); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE public.reject_recommendation(IN u_id integer, IN p_id integer, IN alt_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO recommendations (user_id, original_product_id, recommended_product_id, status)
    VALUES (u_id, p_id, alt_id, 'rejected');
END;
$$;


ALTER PROCEDURE public.reject_recommendation(IN u_id integer, IN p_id integer, IN alt_id integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    category_id integer,
    name character varying(255) NOT NULL,
    brand character varying(100),
    price numeric(10,2) NOT NULL,
    unit_quantity numeric(10,2),
    unit_type character varying(20),
    nutrition_score integer,
    is_available boolean DEFAULT true,
    image_url text,
    CONSTRAINT products_nutrition_score_check CHECK (((nutrition_score >= '-15'::integer) AND (nutrition_score <= 100)))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: shopping_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shopping_lists (
    id integer NOT NULL,
    user_id integer,
    product_id integer,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shopping_lists OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: health_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.health_dashboard AS
 SELECT u.id AS user_id,
    u.username,
    count(sl.product_id) AS total_items,
    avg(p.nutrition_score) AS avg_health_score,
    sum(p.price) AS total_spend
   FROM ((public.users u
     LEFT JOIN public.shopping_lists sl ON ((u.id = sl.user_id)))
     LEFT JOIN public.products p ON ((sl.product_id = p.id)))
  GROUP BY u.id, u.username;


ALTER VIEW public.health_dashboard OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: recommendations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recommendations (
    id integer NOT NULL,
    user_id integer,
    original_product_id integer,
    recommended_product_id integer,
    status character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_status CHECK (((status)::text = ANY ((ARRAY['accepted'::character varying, 'rejected'::character varying, 'pending'::character varying])::text[]))),
    CONSTRAINT recommendations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.recommendations OWNER TO postgres;

--
-- Name: recommendations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recommendations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recommendations_id_seq OWNER TO postgres;

--
-- Name: recommendations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recommendations_id_seq OWNED BY public.recommendations.id;


--
-- Name: shopping_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shopping_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shopping_lists_id_seq OWNER TO postgres;

--
-- Name: shopping_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shopping_lists_id_seq OWNED BY public.shopping_lists.id;


--
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
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: recommendations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendations ALTER COLUMN id SET DEFAULT nextval('public.recommendations_id_seq'::regclass);


--
-- Name: shopping_lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_lists ALTER COLUMN id SET DEFAULT nextval('public.shopping_lists_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: recommendations recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_pkey PRIMARY KEY (id);


--
-- Name: shopping_lists shopping_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_pkey PRIMARY KEY (id);


--
-- Name: categories unique_category_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT unique_category_name UNIQUE (name);


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
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_products_cat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_cat_id ON public.products USING btree (category_id);


--
-- Name: idx_products_price_health; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_price_health ON public.products USING btree (price, nutrition_score);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: recommendations recommendations_original_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_original_product_id_fkey FOREIGN KEY (original_product_id) REFERENCES public.products(id);


--
-- Name: recommendations recommendations_recommended_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_recommended_product_id_fkey FOREIGN KEY (recommended_product_id) REFERENCES public.products(id);


--
-- Name: recommendations recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: shopping_lists shopping_lists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shopping_lists shopping_lists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shopping_lists
    ADD CONSTRAINT shopping_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict qWnVXvvHIUgxka7htt14sQr3kxHNgBaPpaH0XOScu5OrHdZdNzVqYBUQBMKJTRa

