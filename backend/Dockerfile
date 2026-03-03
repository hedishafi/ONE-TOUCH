# ─── Base image ───────────────────────────────────────────────────────────────
FROM python:3.11-slim

# ─── Environment ──────────────────────────────────────────────────────────────
# Prevents Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Keeps stdout/stderr unbuffered (logs appear immediately)
ENV PYTHONUNBUFFERED=1
# Put pip-installed scripts on PATH
ENV PATH="/home/appuser/.local/bin:${PATH}"

# ─── System dependencies ──────────────────────────────────────────────────────
# postgresql-client  → needed for pg_isready in entrypoint.sh
# gettext            → needed for Django's makemessages / i18n
# curl               → useful for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        gettext \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Non-root user ────────────────────────────────────────────────────────────
# Running as root inside a container is a security risk.
RUN useradd --create-home appuser
WORKDIR /home/appuser/code

# ─── Python dependencies ──────────────────────────────────────────────────────
# Copy only requirements first so Docker can cache this layer.
# The full source is copied afterwards; requirements only re-install when
# requirements.txt actually changes.
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ─── Application source ───────────────────────────────────────────────────────
COPY --chown=appuser:appuser . .

# ─── Entrypoint ───────────────────────────────────────────────────────────────
RUN chmod +x /home/appuser/code/entrypoint.sh

# Switch to non-root user
USER appuser

EXPOSE 8000

ENTRYPOINT ["/home/appuser/code/entrypoint.sh"]
