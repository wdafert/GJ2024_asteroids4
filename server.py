import os
from flask import Flask, send_from_directory
import logging

app = Flask(__name__, static_folder='static')
app.logger.setLevel(logging.DEBUG)

@app.route('/')
def serve_index():
    app.logger.debug(f"Serving index.html from {app.static_folder}")
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    app.logger.debug(f"Requested path: {path}")
    full_path = os.path.join(app.static_folder, path)
    app.logger.debug(f"Full path: {full_path}")
    app.logger.debug(f"File exists: {os.path.exists(full_path)}")
    
    if path != "" and os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    else:
        app.logger.debug("Falling back to index.html")
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
