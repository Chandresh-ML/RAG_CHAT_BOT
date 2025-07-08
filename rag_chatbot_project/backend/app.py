from flask import Flask, request, jsonify
from pymongo import MongoClient
import uuid
from datetime import datetime
from pymongo.errors import PyMongoError
import re
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/", serverSelectionTimeoutMS=5000)
db = client["grievance_db"]
complaints = db["complaints"]

@app.route("/register", methods=["POST"])
def register_complaint():
    try:
        data = request.get_json(force=True)

        # Required fields including email
        required_fields = ["name", "mobile", "details", "email"]
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({"error": f"'{field}' is required."}), 400

        name = data["name"].strip()
        mobile = data["mobile"].strip()
        details = data["details"].strip()
        email = data["email"].strip()

        # Validate mobile number
        if not re.match(r"^(\+91)?[6-9]\d{9}$", mobile):
            return jsonify({"error": "Invalid mobile number format."}), 400

        # Validate email format
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email format."}), 400

        complaint_id = str(uuid.uuid4())[:8]
        complaint = {
            "id": complaint_id,
            "name": name,
            "mobile": mobile,
            "email": email,
            "details": details,
            "status": "In Progress",
            "created_at": datetime.now().isoformat()
        }

        complaints.insert_one(complaint)
        return jsonify({
            "complaint_id": complaint_id,
            "message": "Complaint registered successfully"
        }), 201

    except PyMongoError as e:
        return jsonify({"error": "Database error occurred.", "details": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500

@app.route("/status/<complaint_id>", methods=["GET"])
def check_status(complaint_id):
    complaint = complaints.find_one({"id": complaint_id}, {"_id": 0})
    if complaint:
        return jsonify(complaint), 200
    return jsonify({"message": "Complaint not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)
