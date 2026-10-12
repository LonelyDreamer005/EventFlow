"""
EventFlow — Backend Entry Point
Used by: flask run (dev), gunicorn (prod), tests
"""

import os
import sys
from dotenv import load_dotenv

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()  # Load .env file if present

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
