from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_user_has_provider_role_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'accounts_providermanualverification'
                      AND column_name = 'admin_hint'
                ) THEN
                    UPDATE accounts_providermanualverification
                    SET admin_hint = ''
                    WHERE admin_hint IS NULL;

                    ALTER TABLE accounts_providermanualverification
                    ALTER COLUMN admin_hint SET DEFAULT '';
                ELSE
                    ALTER TABLE accounts_providermanualverification
                    ADD COLUMN admin_hint text NOT NULL DEFAULT '';
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
