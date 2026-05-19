#  Smart Rationing & Adaptive Budget System

A health-aware grocery management platform that helps users build smarter shopping baskets. SRABS analyzes the nutritional scores of items in a user's cart and automatically suggests healthier, category-matched alternatives — all driven by a normalized PostgreSQL database with PL/pgSQL business logic.


## What It Does

Most grocery apps tell you what something costs. SRABS tells you what it costs your health.

When a user adds products to their basket, the recommendation engine scans each item, finds alternatives in the same food category with a better nutrition score, and presents them as swappable suggestions. The user can **accept** the swap (the product is replaced in their cart atomically) or **reject** it (the alternative is permanently suppressed for that user and never suggested again). A live **health dashboard** then shows their basket's average nutrition score and total estimated spend — giving a single-glance summary of how healthy and how expensive their shop is.


## Tech Stack

| Layer | Technology |

| Database | PostgreSQL 18.3 + PL/pgSQL |
| Backend | Node.js, Express.js v5 |
| Frontend | React (Create React App) |
| Auth | JWT + bcrypt |
| DB Driver | node-postgres (`pg`) |
| Data Importer | Python 3 + psycopg2 |
| Dataset | UK Open Food Facts (~24,570 products) |


## Directory Structure

smart rationing and adaptive budget system/
│
├── ProdCreator.py                  # Seeds the database from CSV
├── uk_perfect_products.csv         # UK grocery dataset (~24,570 products)
│
└── srabs/
    ├── srabs_schema_backup.sql     # Full PostgreSQL schema (tables, views, procedures)
    ├── backend/                    # Node.js / Express REST API
    └── frontend/                   # React single-page application



## Database Design

The schema is in **Third Normal Form (3NF)** across five tables:


users ──< shopping_lists >── products ──> categories (self-referencing)
  └──────< recommendations >── products


| Table | Role |
|---|---|
| `users` | Registered accounts |
| `categories` | Two-level food hierarchy (e.g. *Fruits & Vegetables → Fruits*) |
| `products` | ~24,570 UK grocery items with price, brand, and nutrition score |
| `shopping_lists` | User basket — links users to products with a timestamp |
| `recommendations` | Audit log of every pending / accepted / rejected suggestion |
| `health_dashboard` *(view)* | Per-user aggregation: item count, avg nutrition score, total spend |

### Recommendation Engine (`get_recommendations`)

The core of the system is a PL/pgSQL stored function that runs in three steps every time it's called:

1. **Clear stale suggestions** — deletes old `pending` records so results are always fresh.
2. **Find alternatives** — for each basket item, joins products in the same category where the nutrition score is lower, the name shares a keyword match, and the alternative hasn't been previously rejected by that user.
3. **Return results** — inserts the new suggestions as `pending` and returns them to the API.

## Two additional stored procedures handle user decisions:

- accept_recommendation` — atomically updates the shopping list and logs the swap as `accepted`.
- reject_recommendation` — logs the alternative as `rejected`; the `NOT EXISTS` filter in the engine ensures it is never surfaced again.

### Performance

## Two B-tree indexes keep queries fast at scale:

- idx_products_cat_id` — speeds up category joins during recommendation lookups.
- idx_products_price_health` — composite index on `(price, nutrition_score)` for sorting by cost and health together.

---

## Setup

### 1. Database

## bash
psql -U postgres -c "CREATE DATABASE SRABS_DB;"
psql -U postgres -d SRABS_DB -f srabs/srabs_schema_backup.sql

##  2. Seed Products

bash
pip install psycopg2-binary
python ProdCreator.py


### 3. Backend

Create `srabs/backend/.env`:

env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=SRABS_DB
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret
PORT=5000


bash
cd srabs/backend && npm install && node server.js


### 4. Frontend

bash
cd srabs/frontend && npm install && npm start


App runs at `http://localhost:3000` — API at `http://localhost:5000`.


## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/products?search=` | Search products |
| `POST` | `/api/cart/add` | Add item to basket |
| `GET` | `/api/cart/:userId` | Fetch basket |
| `DELETE` | `/api/cart/remove` | Remove item |
| `GET` | `/api/recommendations/:userId` | Get recommendations |
| `POST` | `/api/recommendations/accept` | Accept & swap product |
| `POST` | `/api/recommendations/reject` | Reject suggestion |

---

## Dataset

The product data comes from the [UK Open Food Facts](https://world.openfoodfacts.org/) database — real products from Sainsbury's, Tesco, Waitrose, and 500+ brands. The `nutriscore` column (−15 to +100) is the signal the recommendation engine optimizes against. Prices are generated by `ProdCreator.py` using realistic GBP ranges per food category with standard retail pricing (e.g. £1.99, £3.50).


