from app import app

# For gunicorn to find the app
application = app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
