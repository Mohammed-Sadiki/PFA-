from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session, closes it after request."""
    import logging
    db = SessionLocal()
    try:
        yield db
    except Exception as exc:
        db_log = logging.getLogger("app")
        db_log.error("Action: Transaction base de données | Résultat: Échec (Erreur DB : %s)", exc, exc_info=exc)
        raise exc
    finally:
        db.close()



def init_db():
    """Create all tables. Called on app startup."""
    # Import models so SQLAlchemy registers them before create_all
    from app.models import user, vm, audit_log  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Ensure vrde_port column exists for existing SQLite database
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            res = conn.execute(text("PRAGMA table_info(vms);")).fetchall()
            cols = [row[1] for row in res]
            if "vrde_port" not in cols:
                conn.execute(text("ALTER TABLE vms ADD COLUMN vrde_port INTEGER;"))
                conn.commit()
    except Exception as exc:
        import logging
        logging.getLogger("app").warning("Migration check for vrde_port: %s", exc)
