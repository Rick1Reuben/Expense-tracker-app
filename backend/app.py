from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from flask_bcrypt import Bcrypt
import jwt
from functools import wraps
from models import db, User, Expense

app = Flask(__name__)
CORS(app, supports_credentials=True, origin='http://localhost:3000')

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///expenses.db'
app.config['JWT_SECRET_KEY'] = 'blimybuggyapp1'

db.init_app(app)
bcrypt = Bcrypt(app)

with app.app_context():
    db.create_all()

def jwt_required():
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                try:
                    token = auth_header.split(" ")[1]
                except IndexError:
                    return jsonify({'error': 'Bearer token not found'}), 401

            if not token:
                return jsonify({'error': 'Token is missing'}), 401

            try:
                data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
                current_user = User.query.get(data['user_id'])
                if not current_user:
                    return jsonify({'error': 'Invalid user'}), 401
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

            return fn(current_user, *args, **kwargs)

        return wrapper
    return decorator

@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already in use'}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password_hash, password):
        expiration_time = datetime.utcnow() + timedelta(hours=1)
        payload = {
            'user_id': user.id,
            'username': user.username,
            'exp': expiration_time
        }
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        return jsonify({'message': 'Login successful', 'token': token}), 200
    return jsonify({'message': 'Invalid username or password'}), 401

@app.route('/logout')
def logout_user():
    return jsonify({'message': 'Logged out successfully'}), 200 # Frontend will handle token removal

@app.route('/expenses', methods=['POST'])
@jwt_required()
def add_expense(current_user):
    data = request.get_json()
    description = data.get('description')
    amount = data.get('amount')
    category = data.get('category')

    if not description or not amount or not category:
        return jsonify({'error': 'Please provide all required fields'}), 400

    new_expense = Expense(description=description, amount=amount, category=category, user_id=current_user.id)
    db.session.add(new_expense)
    db.session.commit()

    return jsonify({
        'message': 'Expense added successfully!',
        'expense': {
            'id': new_expense.id,
            'description': new_expense.description,
            'amount': new_expense.amount,
            'category': new_expense.category,
            'date': new_expense.date.isoformat()
        }
    }), 201

@app.route('/expenses', methods=['GET'])
@jwt_required()
def get_all_expenses(current_user):
    expenses = Expense.query.filter_by(user_id=current_user.id).all()
    expense_list = [{
        'id': e.id,
        'description': e.description,
        'amount': e.amount,
        'category': e.category,
        'date': e.date.isoformat()
    } for e in expenses]
    return jsonify({'expenses': expense_list}), 200

@app.route('/expenses/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_expense(current_user, id):
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first()
    if expense:
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully!'}), 200
    return jsonify({'error': 'Expense not found or unauthorized'}), 404

@app.route('/profile', methods=['GET'])
@jwt_required()
def get_profile(current_user):
    return jsonify({
        'username': current_user.username,
        'email': current_user.email,
        'salary': current_user.salary
    }), 200

@app.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile(current_user):
    data = request.get_json()
    if 'salary' in data:
        current_user.salary = data['salary']
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/delete_account', methods=['DELETE'])
@jwt_required()
def delete_account(current_user):
    Expense.query.filter_by(user_id=current_user.id).delete()
    db.session.delete(current_user)
    db.session.commit()
    return jsonify({'message': 'Account deleted successfully'}), 200

@app.route('/')
def hello_world():
    return 'Hello from the Flask backend!'

if __name__ == '__main__':
    app.run(debug=True)