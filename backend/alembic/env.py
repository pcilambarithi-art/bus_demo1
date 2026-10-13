from logging.config import fileConfig
from alembic import context
from backend.app.database import MODULE_ENGINES
import backend.app.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_online() -> None:
    """Runs Alembic migrations sequentially across all 6 logical databases."""
    for db_name, (base_cls, mod_engine, _) in MODULE_ENGINES.items():
        with mod_engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=base_cls.metadata,
                version_table=f"alembic_version_{db_name}",
            )
            with context.begin_transaction():
                context.run_migrations()


run_migrations_online()
