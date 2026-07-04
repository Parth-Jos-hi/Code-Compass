FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt .

# Install build tools so wheels can be built when necessary
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY backend/app ./app
COPY backend/chroma_data ./chroma_data

ENV DATABASE_URL=sqlite:///./local_compass.db
ENV CHROMA_DB_DIR=./chroma_data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
