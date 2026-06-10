# app/minio_api.py
import io
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool
import json
from minio import Minio
from bs4 import BeautifulSoup
from ebooklib import epub, ITEM_DOCUMENT
from tempfile import NamedTemporaryFile
import os

logger = logging.getLogger(__name__)

minio_router = APIRouter()

client = Minio(
    "minio:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

bucket_name = "books"

try:
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
        logger.info("Created MinIO bucket %s", bucket_name)
except Exception:
    logger.exception("Failed to ensure MinIO bucket exists")


@minio_router.get("/books/cover/{object_name}")
async def get_books_cover(object_name: str):
    try:
        data = client.get_object(bucket_name, object_name)
        return StreamingResponse(data, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Error getting cover: {e}")
        raise HTTPException(status_code=404, detail="Cover not found")


@minio_router.get("/books/content/{object_name}")
async def get_books_content(
    object_name: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(1, ge=1, le=100)
):
    try:
        response = client.get_object(bucket_name, object_name)
        content_bytes = response.read()
        response.close()
        response.release_conn()

        data = json.loads(content_bytes)
        page_keys = sorted(data.keys(), key=lambda k: int(k))
        
        start_idx = offset
        end_idx = min(offset + limit, len(page_keys))
        paginated_keys = page_keys[start_idx:end_idx]
        
        result = {key: data[key] for key in paginated_keys}
        return JSONResponse(content=result)

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=500, detail="Invalid JSON file")
    except Exception as e:
        logger.error(f"Error getting content: {e}")
        raise HTTPException(status_code=404, detail=f"File not found: {object_name}")


def split_text_into_chunks(text: str, chunk_size: int = 3000) -> dict[str, str]:
    chunks = {}
    page = 1
    for i in range(0, len(text), chunk_size):
        chunks[str(page)] = text[i:i + chunk_size]
        page += 1
    return chunks


def extract_text_from_epub(epub_path: str) -> str:
    book = epub.read_epub(epub_path)
    parts = []
    for item in book.get_items_of_type(ITEM_DOCUMENT):
        html = item.get_content()
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True)
        if text:
            parts.append(text)
    return "\n".join(parts)


async def upload_book_to_minio(file: UploadFile = File(...)) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is missing")
    if not file.filename.lower().endswith(".epub"):
        raise HTTPException(status_code=400, detail="Only .epub files are allowed")
    
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    
    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=".epub") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        text = extract_text_from_epub(tmp_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text found in EPUB")

        chunks = split_text_into_chunks(text, chunk_size=3000)
        json_bytes = json.dumps(chunks, ensure_ascii=False, indent=2).encode("utf-8")
        json_filename = f"{uuid.uuid4().hex}.json"

        file_obj = io.BytesIO(json_bytes)
        file_obj.seek(0)

        await run_in_threadpool(
            client.put_object,
            bucket_name,
            json_filename,
            file_obj,
            length=len(json_bytes),
        )
        return json_filename  

    except HTTPException:
        raise
    except Exception as e:
        print("UNEXPECTED ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="Failed to parse EPUB file")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            print("tmp removed")


async def upload_cover_to_minio(file: UploadFile = File(...)) -> str:
    contents = await file.read()
    ext = ""
    if "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    
    file_obj = io.BytesIO(contents)
    file_obj.seek(0)
    
    try:
        await run_in_threadpool(
            client.put_object,
            bucket_name,
            filename,
            file_obj,
            length=len(contents),
        )
    except Exception as e:
        logger.exception("MinIO upload failed")
        raise HTTPException(status_code=500, detail="Failed to upload file to MinIO")
    
    return filename


async def delete_book_from_minio(file_name: str) -> None:
    try:
        await run_in_threadpool(
            client.remove_object,
            bucket_name,
            file_name
        )
    except Exception as e:
        logger.exception("MinIO delete failed")
        raise HTTPException(status_code=500, detail=f"Failed to delete file from MinIO: {str(e)}")