from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import admin, categories, directory, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="DOGS API",
    description="Data Organization for Good and Sharing — canonical shared data platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(categories.router)
app.include_router(directory.router)
app.include_router(admin.router)
