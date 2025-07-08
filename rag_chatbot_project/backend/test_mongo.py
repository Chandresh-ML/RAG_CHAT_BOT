from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

try:
    client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=3000)
    client.admin.command("ping")
    print("✅ MongoDB connection successful.")
except ConnectionFailure as e:
    print("❌ MongoDB connection failed:", e)
