import json
from pathlib import Path

MEMORY_DIR = Path('data/memory')

def load_history(bot_id):
    """Load chat history for a specific bot from disk."""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    file_path = MEMORY_DIR / f'{bot_id}.json'
    if not file_path.exists():
        return []
    try:
        return json.loads(file_path.read_text())
    except Exception:
        return []

def save_history(bot_id, history):
    """Save chat history for a specific bot to disk."""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    file_path = MEMORY_DIR / f'{bot_id}.json'
    file_path.write_text(json.dumps(history))

def clear_history(bot_id):
    """Delete the history file for a specific bot."""
    file_path = MEMORY_DIR / f'{bot_id}.json'
    if file_path.exists():
        file_path.unlink()
