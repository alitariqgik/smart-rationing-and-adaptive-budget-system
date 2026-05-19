import csv
import psycopg2
import random
import re

# Database connection details
DB_PARAMS = {
    "dbname": "SRABS_DB",
    "user": "postgres",
    "password": "dragonoid",
    "host": "localhost"
}

# Retail price suffixes for psychological pricing
SUFFIXES = [0.99, 0.99, 0.99, 0.00, 0.50, 0.95, 0.49]

# Price ranges based on Category 1 (UK Pounds)
PRICE_RANGES = {
    "Beverages": (1, 4),
    "Snacks": (1, 3),
    "Meats": (4, 12),
    "Dairy": (1, 5),
    "Cereals and potatoes": (2, 6),
    "Fruits and vegetables": (1, 4),
    "Fish Meat Eggs": (3, 10),
    "Default": (2, 7)
}

def get_retail_price(category_1):
    """Generates a realistic retail price like £2.99 or £4.50."""
    low, high = PRICE_RANGES.get(category_1, PRICE_RANGES["Default"])
    pounds = random.randint(low, high)
    pence = random.choice(SUFFIXES)
    return float(pounds) + pence

def parse_quantity(qty_str):
    """Splits strings like '500g' into (500.0, 'g')."""
    if not qty_str:
        return 1.0, "unit"
    match = re.search(r"(\d+\.?\d*)\s*([a-zA-Z]+)", str(qty_str))
    if match:
        return float(match.group(1)), match.group(2)
    return 1.0, "unit"

def clean_int(value):
    """Safely convert string to integer, handling decimals and empty strings."""
    try:
        if not value or value.strip() == "":
            return 0 
        return int(float(value)) 
    except:
        return 0

def import_products(csv_file):
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    print("Clearing old products and restarting import...")
    # CASCADE ensures shopping_lists and recommendations are cleared to prevent FK errors
    cur.execute("TRUNCATE TABLE products RESTART IDENTITY CASCADE;")
    conn.commit()

    success_count = 0
    fail_count = 0

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # 1. Get Category ID
                cur.execute("SELECT id FROM categories WHERE name = %s", (row['category_2'].strip(),))
                res = cur.fetchone()
                
                if not res:
                    fail_count += 1
                    continue
                    
                cat_id = res[0]

                # 2. Process Row Data
                price = get_retail_price(row['category_1'])
                qty_val, qty_unit = parse_quantity(row['quantity'])
                score = clean_int(row['nutriscore'])
                
                # Extract image_url from CSV
                img_url = row.get('image_url', '').strip()

                # 3. Insert into database
                cur.execute("""
                    INSERT INTO products 
                    (category_id, name, brand, price, unit_quantity, unit_type, nutrition_score, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cat_id, 
                    row['product_name'], 
                    row['brand'], 
                    price, 
                    qty_val, 
                    qty_unit, 
                    score, 
                    img_url
                ))
                
                success_count += 1
                
                # Commit every 500 rows for performance
                if success_count % 500 == 0:
                    conn.commit()
                    print(f"Progress: {success_count} rows inserted...")

            except Exception as e:
                print(f"Error on product '{row.get('product_name')}': {e}")
                conn.rollback()
                fail_count += 1
        
        conn.commit() 

    print("-" * 30)
    print(f"FINAL REPORT: Success: {success_count} | Failed: {fail_count}")
    print("-" * 30)
    cur.close()
    conn.close()

if __name__ == "__main__":
    import_products('uk_perfect_products.csv')