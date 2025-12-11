#database.py
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings
import json
 

# Create SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  
    echo=False          
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()

# Optional columns that might not exist in legacy databases. We'll ensure
# they're present at startup so newer parts of the codebase (like company
# profile management) don't fail when selecting from the "users" table.
_USER_OPTIONAL_COLUMNS = {
    "company_name": "VARCHAR(255)",
    "company_email": "VARCHAR(255)",
    "company_phone": "VARCHAR(50)",
    "company_website": "VARCHAR(255)",
    "company_address": "VARCHAR(500)",
}

_CLIENT_OPTIONAL_COLUMNS = {
    "created_by_id": "INT",
    "assigned_manager_id": "INT",
    # Ensure currency is present on legacy databases so account currency
    # selection works without manual migrations.
    "currency_code": "VARCHAR(10) DEFAULT 'USD'",
    # Store multiple customer IDs as JSON for Google Ads account linking
    "customer_ids": "JSON",
}


def ensure_user_optional_columns() -> None:
    """Ensure optional company columns exist on the users table.

    Older databases may have been created before these fields were added to
    the ORM model. When the ORM attempts to select the columns SQLAlchemy will
    ask MySQL for them which raises "Unknown column" errors. We defensively
    inspect the schema and add any missing columns so authentication and other
    flows keep working without requiring a manual migration.
    """

    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    missing_columns = [
        column_name
        for column_name in _USER_OPTIONAL_COLUMNS
        if column_name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as connection:
        for column_name in missing_columns:
            ddl = f"ALTER TABLE users ADD COLUMN {column_name} {_USER_OPTIONAL_COLUMNS[column_name]} NULL"
            connection.execute(text(ddl))


def ensure_client_assignment_columns() -> None:
    """Ensure client assignment metadata columns exist on the clients table."""

    inspector = inspect(engine)
    if not inspector.has_table("clients"):
        return

    existing_columns = {col["name"] for col in inspector.get_columns("clients")}
    missing_columns = [
        column_name
        for column_name in _CLIENT_OPTIONAL_COLUMNS
        if column_name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as connection:
        for column_name in missing_columns:
            ddl = f"ALTER TABLE clients ADD COLUMN {column_name} {_CLIENT_OPTIONAL_COLUMNS[column_name]} NULL"
            connection.execute(text(ddl))

def backfill_customer_ids_column() -> None:
    """Populate the JSON customer_ids column from legacy comma strings."""

    inspector = inspect(engine)
    if not inspector.has_table("clients"):
        return

    column_names = {col["name"] for col in inspector.get_columns("clients")}
    if "customer_ids" not in column_names:
        return

    with engine.begin() as connection:
        results = connection.execute(
            text("SELECT id, customer_id, customer_ids FROM clients")
        )

        for row in results:
            mapping = row._mapping
            if mapping.get("customer_ids") is not None:
                continue

            raw_value = mapping.get("customer_id") or ""
            parsed = [
                "".join(ch for ch in str(cid).strip() if ch.isdigit())
                for cid in str(raw_value).split(",")
                if str(cid).strip()
            ]
            cleaned = [cid for cid in parsed if cid]

            if not cleaned:
                continue

            connection.execute(
                text("UPDATE clients SET customer_ids = :customer_ids WHERE id = :id"),
                {"customer_ids": json.dumps(cleaned), "id": mapping.get("id")},
            )


# FastAPI Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Optional: Direct DB connection test
if __name__ == "__main__":
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("Database connection successful!")
    except Exception as e:
        print("Database connection failed:", e)
