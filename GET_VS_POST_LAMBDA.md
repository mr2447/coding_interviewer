# GET vs POST: How API Gateway Passes Data to Lambda

## Key Difference

### GET Requests → Use `queryStringParameters`
### POST Requests → Use `body`

## GET /questions Endpoint

**Frontend sends:**
```javascript
GET /questions?userId=123&topic=Arrays&difficulty=Medium
```

**API Gateway Lambda Proxy event structure:**
```python
{
    "httpMethod": "GET",
    "queryStringParameters": {
        "userId": "123",
        "topic": "Arrays",
        "difficulty": "Medium"
    },
    "body": null  # GET requests don't have a body
}
```

**Lambda code:**
```python
query_params = event.get("queryStringParameters") or {}
userId = query_params.get("userId")
topic = query_params.get("topic")
difficulty = query_params.get("difficulty")
```

✅ **This works because GET requests send data in the URL query string**

---

## POST /hint Endpoint

**Frontend sends:**
```javascript
POST /hint
Body: {
    "userId": "123",
    "qid": 105,
    "user_code": "...",
    "thread_id": "..."
}
```

**API Gateway Lambda Proxy event structure:**
```python
{
    "httpMethod": "POST",
    "queryStringParameters": None,  # POST requests typically don't have query params
    "body": "{\"userId\":\"123\",\"qid\":105,\"user_code\":\"...\"}"  # JSON string
}
```

**Lambda code:**
```python
body = event.get("body")  # Get the JSON string
body = json.loads(body)   # Parse it
userId = body.get("userId")
user_code = body.get("user_code")
```

✅ **This works because POST requests send data in the request body**

---

## Why the Difference?

### HTTP Method Conventions:

1. **GET** - Used for retrieving data
   - Data goes in URL: `/questions?userId=123`
   - Visible in browser address bar
   - Limited size (URL length limits)
   - Can be cached
   - **API Gateway provides: `queryStringParameters`**

2. **POST** - Used for sending/submitting data
   - Data goes in request body
   - Not visible in URL
   - No size limit (practically)
   - Not cached
   - **API Gateway provides: `body` (as JSON string)**

---

## API Gateway Lambda Proxy Event Structure

```python
{
    "httpMethod": "GET" or "POST" or "OPTIONS",
    "path": "/hint",
    "queryStringParameters": {
        # Only populated for GET requests with query params
        # None for POST requests (unless they have query params too)
    },
    "body": "..." or None,
    # body is:
    # - None for GET requests
    # - JSON string for POST requests (needs parsing)
    # - Empty string for OPTIONS requests
    "headers": {...},
    "requestContext": {...}
}
```

---

## Summary

| HTTP Method | Data Location | Lambda Access | Example |
|-------------|---------------|---------------|---------|
| **GET** | URL query string | `event["queryStringParameters"]` | `/questions?userId=123` |
| **POST** | Request body | `event["body"]` (JSON string) | `{"userId": "123"}` |
| **OPTIONS** | No data | Both are None/empty | CORS preflight |

---

## Your Code Examples

### GET Questions Lambda:
```python
query_params = event.get("queryStringParameters") or {}
userId = query_params.get("userId")  # ✅ From query string
```

### POST Hint Lambda:
```python
body = event.get("body")
body = json.loads(body)  # Parse JSON string
userId = body.get("userId")  # ✅ From request body
```

---

## Could POST Use Query Parameters?

**Technically yes, but it's not recommended:**

```python
# POST /hint?userId=123 (unusual but possible)
query_params = event.get("queryStringParameters") or {}
userId = query_params.get("userId")  # Would work

# But typically POST uses body:
body = json.loads(event.get("body"))
userId = body.get("userId")  # Standard approach
```

**Best Practice:** Use query params for GET, body for POST.

