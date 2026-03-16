# database.py
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import json


def _build_database_url(raw_url: str) -> str:
    """
    Normalize DB URL and automatically enforce sslmode=require
    for PostgreSQL connections when not already present.
    """
    if not raw_url:
        raise ValueError("DATABASE_URL is not configured")

    url = raw_url.strip()

    # Normalize postgres scheme for SQLAlchemy + psycopg if needed
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    parsed = urlparse(url)

    # Add sslmode=require for postgres if missing
    if parsed.scheme.startswith("postgresql"):
        query = parse_qs(parsed.query)
        if "sslmode" not in query:
            query["sslmode"] = ["require"]

        url = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                urlencode(query, doseq=True),
                parsed.fragment,
            )
        )

    return url


DATABASE_URL = _build_database_url(settings.DATABASE_URL)

# Create SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    connect_args={"sslmode": "require"},
    echo=False,
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

_CAMPAIGN_OPTIONAL_COLUMNS = {
    "conversions": "INT DEFAULT 0",
    "ctr": "FLOAT DEFAULT 0",
    "average_cpc": "FLOAT DEFAULT 0",
    "conversion_value": "FLOAT DEFAULT 0",
    "cost_per_conversion": "FLOAT DEFAULT 0",
}


def ensure_user_optional_columns() -> None:
    """Ensure optional company columns exist on the users table."""
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
            ddl = (
                f"ALTER TABLE users "
                f"ADD COLUMN {column_name} {_USER_OPTIONAL_COLUMNS[column_name]} NULL"
            )
            connection.execute(text(ddl))
            print(f"Added missing users column: {column_name}")


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
            ddl = (
                f"ALTER TABLE clients "
                f"ADD COLUMN {column_name} {_CLIENT_OPTIONAL_COLUMNS[column_name]} NULL"
            )
            connection.execute(text(ddl))
            print(f"Added missing clients column: {column_name}")


def ensure_campaign_metric_columns() -> None:
    """Ensure newer Google Ads metric columns exist on the campaigns table."""
    inspector = inspect(engine)
    if not inspector.has_table("campaigns"):
        return

    existing_columns = {col["name"] for col in inspector.get_columns("campaigns")}
    missing_columns = [
        column_name
        for column_name in _CAMPAIGN_OPTIONAL_COLUMNS
        if column_name not in existing_columns
    ]

    if not missing_columns:
        return

    with engine.begin() as connection:
        for column_name in missing_columns:
            ddl = (
                f"ALTER TABLE campaigns "
                f"ADD COLUMN {column_name} {_CAMPAIGN_OPTIONAL_COLUMNS[column_name]} NULL"
            )
            connection.execute(text(ddl))
            print(f"Added missing campaigns column: {column_name}")


def ensure_campaign_date_column() -> None:
    """Ensure campaigns.date exists."""
    inspector = inspect(engine)
    if not inspector.has_table("campaigns"):
        return

    existing_columns = {col["name"] for col in inspector.get_columns("campaigns")}
    if "date" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE campaigns ADD COLUMN date DATE NULL"))
        print("Added missing campaigns column: date")


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

        print("Customer IDs backfill completed.")


def initialize_database() -> None:
    """
    Initialize schema and legacy-safe columns only after DB connection succeeds.
    """
    print("Initializing database...")
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Database connection verified.")

    Base.metadata.create_all(bind=engine)
    print("Base tables ensured.")

    ensure_user_optional_columns()
    ensure_client_assignment_columns()
    ensure_campaign_metric_columns()
    ensure_campaign_date_column()
    backfill_customer_ids_column()

    print("Database initialization completed successfully.")


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
        print("Resolved DATABASE_URL:", DATABASE_URL)
    except Exception as e:
        print("Database connection failed:", e)