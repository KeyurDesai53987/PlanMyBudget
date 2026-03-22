# PlanMyBudget API Documentation

## Base URL
```
Production: https://planmybudget.xyz/api
Local: http://localhost:4000/api
```

## Authentication

### Bearer Token (User Authentication)
Most endpoints require a JWT token obtained from login.

```
Authorization: Bearer <token>
```

### API Key (Third-Party Access)
For third-party integrations, use an API key:

```
X-API-Key: <your-api-key>
```

API keys can be generated from the Settings page.

---

## Public Endpoints

### Health Check
```
GET /api/status
```
Response:
```json
{ "status": "ok" }
```

### Login
```
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
Response:
```json
{
  "token": "abc123...",
  "userId": "user-uuid"
}
```

### Register
```
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
Response:
```json
{
  "userId": "user-uuid",
  "email": "user@example.com"
}
```

### Logout
```
POST /api/logout
Authorization: Bearer <token>
```

---

## Protected Endpoints

All protected endpoints require either:
- `Authorization: Bearer <token>` header
- `X-API-Key: <api-key>` header

---

### Accounts

#### List Accounts
```
GET /api/accounts
Authorization: Bearer <token>
```
Response:
```json
{
  "accounts": [
    {
      "id": "acc-uuid",
      "name": "Checking Account",
      "type": "checking",
      "currency": "USD",
      "balance": 1500.00,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Account
```
POST /api/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Savings Account",
  "type": "savings",
  "currency": "USD",
  "balance": 1000
}
```

#### Update Account
```
PUT /api/accounts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "type": "checking",
  "currency": "USD"
}
```

#### Delete Account
```
DELETE /api/accounts/:id
Authorization: Bearer <token>
```

---

### Transactions

#### List Transactions
```
GET /api/transactions
Authorization: Bearer <token>
```
Query params: `?accountId=<id>&categoryId=<id>&startDate=<date>&endDate=<date>&search=<term>`

#### Create Transaction
```
POST /api/transactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountId": "acc-uuid",
  "categoryId": "cat-uuid",  // optional
  "date": "2024-01-15",
  "amount": 50.00,
  "type": "debit",  // or "credit"
  "description": "Grocery shopping"
}
```

#### Update Transaction
```
PUT /api/transactions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 75.00,
  "description": "Updated description"
}
```

#### Delete Transaction
```
DELETE /api/transactions/:id
Authorization: Bearer <token>
```

---

### Budgets

#### List Budgets
```
GET /api/budgets
Authorization: Bearer <token>
```
Response:
```json
{
  "budgets": [
    {
      "id": "bud-uuid",
      "month": 1,
      "year": 2024,
      "currency": "USD",
      "lines": [
        { "categoryId": "cat-uuid", "amount": 500 }
      ]
    }
  ]
}
```

#### Create Budget
```
POST /api/budgets
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 1,
  "year": 2024,
  "currency": "USD",
  "lines": [
    { "categoryId": "cat-food", "amount": 400 },
    { "categoryId": "cat-ent", "amount": 150 }
  ]
}
```

---

### Goals

#### List Goals
```
GET /api/goals
Authorization: Bearer <token>
```
Response:
```json
{
  "goals": [
    {
      "id": "goal-uuid",
      "name": "Emergency Fund",
      "targetAmount": 5000,
      "currentAmount": 1200,
      "dueDate": "2024-12-31",
      "status": "active"
    }
  ]
}
```

#### Create Goal
```
POST /api/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vacation Fund",
  "targetAmount": 3000,
  "dueDate": "2024-06-01"
}
```

#### Update Goal (e.g., add funds)
```
PUT /api/goals/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentAmount": 1500
}
```

---

### Categories

#### List Categories
```
GET /api/categories
Authorization: Bearer <token>
```
Response:
```json
{
  "categories": [
    {
      "id": "cat-uuid",
      "name": "Groceries",
      "parentId": null
    }
  ]
}
```

#### Create Category
```
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Utilities",
  "parentId": null
}
```

---

### Recurring Transactions

#### List Recurring
```
GET /api/recurring
Authorization: Bearer <token>
```

#### Create Recurring
```
POST /api/recurring
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountId": "acc-uuid",
  "name": "Netflix Subscription",
  "amount": 15.99,
  "type": "debit",
  "frequency": "monthly",
  "startDate": "2024-01-01",
  "nextDate": "2024-01-01",
  "description": "Monthly subscription"
}
```

**Frequency values:** `daily`, `weekly`, `biweekly`, `monthly`, `yearly`

---

### Profile

#### Get Profile
```
GET /api/profile
Authorization: Bearer <token>
```
Response:
```json
{
  "preferences": {
    "email": "user@example.com",
    "name": "John Doe",
    "currency": "USD",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Profile
```
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith"
}
```

#### Change Password
```
PUT /api/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

---

### API Keys (Settings)

#### Generate API Key
```
POST /api/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My App"
}
```
Response:
```json
{
  "apiKey": "sk_live_abc123...",
  "name": "My App",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### List API Keys
```
GET /api/api-keys
Authorization: Bearer <token>
```

#### Revoke API Key
```
DELETE /api/api-keys/:id
Authorization: Bearer <token>
```

---

## Error Responses

All errors return a JSON object:
```json
{
  "error": "Error message here"
}
```

Common status codes:
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limits

- Login: 5 attempts per 15 minutes per IP/email
- OTP requests: 5 per 15 minutes per IP
- OTP verification: 3 attempts per OTP

---

## Example Usage

### cURL
```bash
# Login
curl -X POST https://saveit-r1gc.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@saveit.app","password":"password"}'

# Get accounts (using token)
curl https://saveit-r1gc.onrender.com/api/accounts \
  -H "Authorization: Bearer <token>"

# Get accounts (using API key)
curl https://saveit-r1gc.onrender.com/api/accounts \
  -H "X-API-Key: <api-key>"
```

### JavaScript
```javascript
const API_BASE = 'https://saveit-r1gc.onrender.com/api'

// Login
const loginRes = await fetch(`${API_BASE}/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const { token } = await loginRes.json()

// Get accounts
const accountsRes = await fetch(`${API_BASE}/accounts`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
const { accounts } = await accountsRes.json()
```

### Python
```python
import requests

API_BASE = 'https://saveit-r1gc.onrender.com/api'

# Login
response = requests.post(
    f'{API_BASE}/users/login',
    json={'email': 'demo@saveit.app', 'password': 'password'}
)
token = response.json()['token']

# Get accounts
response = requests.get(
    f'{API_BASE}/accounts',
    headers={'Authorization': f'Bearer {token}'}
)
accounts = response.json()['accounts']
```

---

## iOS App Development (Swift)

### Swift (URLSession)

```swift
let API_BASE = "https://saveit-r1gc.onrender.com/api"

class APIManager {
    static let shared = APIManager()
    var token: String?
    
    func login(email: String, password: String) async throws -> String {
        guard let url = URL(string: "\(API_BASE)/users/login") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.requestFailed
        }
        
        let result = try JSONDecoder().decode(LoginResponse.self, from: data)
        self.token = result.token
        return result.token
    }
    
    func getAccounts() async throws -> [Account] {
        guard let url = URL(string: "\(API_BASE)/accounts") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token ?? "")", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(AccountsResponse.self, from: data)
        return response.accounts
    }
}

// Models
struct LoginResponse: Codable {
    let token: String
    let userId: String
}

struct Account: Codable {
    let id: String
    let name: String
    let type: String
    let balance: Double
}

struct AccountsResponse: Codable {
    let accounts: [Account]
}

enum APIError: Error {
    case invalidURL
    case requestFailed
}
```

### Swift (Alamofire)

```swift
import Alamofire

let API_BASE = "https://saveit-r1gc.onrender.com/api"

// Login
AF.request(
    "\(API_BASE)/users/login",
    method: .post,
    parameters: ["email": email, "password": password],
    encoding: JSONEncoding.default
).responseDecodable(of: LoginResponse.self) { response in
    switch response.result {
    case .success(let data):
        print("Token: \(data.token)")
    case .failure(let error):
        print(error)
    }
}

// Get Accounts
AF.request(
    "\(API_BASE)/accounts",
    method: .get,
    headers: ["Authorization": "Bearer \(token)"]
).responseDecodable(of: AccountsResponse.self) { response in
    if let accounts = response.value?.accounts {
        print(accounts)
    }
}
```

### SwiftUI Example

```swift
import SwiftUI

struct AccountsView: View {
    @State private var accounts: [Account] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            List(accounts) { account in
                VStack(alignment: .leading) {
                    Text(account.name)
                        .font(.headline)
                    Text("$\(account.balance, specifier: "%.2f")")
                        .foregroundColor(.green)
                }
            }
            .navigationTitle("Accounts")
            .onAppear {
                loadAccounts()
            }
        }
    }
    
    func loadAccounts() {
        Task {
            do {
                accounts = try await APIManager.shared.getAccounts()
            } catch {
                print("Error: \(error)")
            }
            isLoading = false
        }
    }
}
```

---

## React Native

```javascript
const API_BASE = 'https://saveit-r1gc.onrender.com/api';

// Login with Axios
const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE}/users/login`, {
      email,
      password
    });
    const { token } = response.data;
    
    // Store token
    await AsyncStorage.setItem('token', token);
    
    return token;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Get Accounts
const getAccounts = async () => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await axios.get(`${API_BASE}/accounts`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data.accounts;
};

// Create Transaction
const createTransaction = async (data) => {
  const token = await AsyncStorage.getItem('token');
  
  const response = await axios.post(`${API_BASE}/transactions`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
};
```

---

## Android (Kotlin)

```kotlin
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

// Retrofit Interface
interface PlanMyBudgetAPI {
    @POST("users/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @GET("accounts")
    suspend fun getAccounts(@Header("Authorization") token: String): Response<AccountsResponse>
    
    @POST("transactions")
    suspend fun createTransaction(
        @Header("Authorization") token: String,
        @Body transaction: Transaction
    ): Response<TransactionResponse>
}

// Usage
val api = Retrofit.Builder()
    .baseUrl("https://saveit-r1gc.onrender.com/api/")
    .addConverterFactory(GsonConverterFactory.create())
    .build()
    .create(PlanMyBudgetAPI::class.java)

// Login
val loginResponse = api.login(LoginRequest(email, password))
val token = loginResponse.body()?.token

// Get Accounts
val accountsResponse = api.getAccounts("Bearer $token")
val accounts = accountsResponse.body()?.accounts
```

---

## Quick Reference

| Feature | Endpoint | Method |
|---------|----------|--------|
| Login | `/users/login` | POST |
| Get Accounts | `/accounts` | GET |
| Create Account | `/accounts` | POST |
| Get Transactions | `/transactions` | GET |
| Create Transaction | `/transactions` | POST |
| Update Transaction | `/transactions/:id` | PUT |
| Delete Transaction | `/transactions/:id` | DELETE |
| Get Budgets | `/budgets` | GET |
| Create Budget | `/budgets` | POST |
| Get Goals | `/goals` | GET |
| Create Goal | `/goals` | POST |
| Update Goal | `/goals/:id` | PUT |
| Get Categories | `/categories` | GET |
| Create Category | `/categories` | POST |

---

## Database Security (Row Level Security)

For enhanced security at the database level, enable PostgreSQL Row Level Security (RLS) policies in your Supabase dashboard.

### Why RLS?

RLS provides an additional layer of security by ensuring users can only access their own data directly in the database, regardless of API-level checks.

### Setup Instructions

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-rls.sql`
4. Click **Run** to execute

### What RLS Protects

| Table | Protection |
|-------|------------|
| `accounts` | Users can only see/modify their own accounts |
| `categories` | Users can only see/modify their own categories |
| `transactions` | Users can only access transactions from their own accounts |
| `budgets` | Users can only see/modify their own budgets |
| `goals` | Users can only see/modify their own goals |
| `recurring` | Users can only see/modify their own recurring transactions |
| `api_keys` | Users can only see/revoke their own API keys |

### Testing RLS

After enabling RLS, verify it works:

```sql
-- Check if RLS is enabled on a table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Test that a user can't see other users' data
SELECT * FROM accounts; -- Should only return your accounts
SELECT * FROM goals;   -- Should only return your goals
```

### Important Notes

- RLS policies are additive to API-level authorization
- The `users` table does not have RLS (users manage their own profile via API)
- The `sessions` table does not have RLS (tokens are validated by the API)

---

## Scalability (Upstash Redis)

For production scalability, enable Upstash Redis for rate limiting and session storage.

### Why Redis?

- **Rate limiting** works across multiple server instances
- **OTP storage** persists across server restarts
- **Free tier** available (10K commands/day)

### Setup Instructions

1. **Create Upstash Redis Database**
   - Go to [console.upstash.com](https://console.upstash.com/redis)
   - Click **Create Database**
   - Choose **Serverless** plan (free)
   - Select a region close to your server
   - Copy the **REST URL** and **REST Token**

2. **Add Environment Variables**

   ```
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-upstash-token
   ```

3. **Deploy**

   Redis will automatically connect when environment variables are set. If not configured, the app falls back to in-memory storage.

### Rate Limits with Redis

| Action | Limit |
|--------|-------|
| Login attempts | 5 per 15 minutes |
| OTP requests | 5 per 15 minutes |
| OTP verification | 3 attempts per code |

### Monitoring

View Redis usage in the Upstash dashboard:
- Command usage
- Memory consumption
- Active connections
