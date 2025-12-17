# RDS Connection Requirements for CognitoPostConfirmation Lambda

## SQL Query Location

The SQL query is in `CognitoPostConfirmation.py` at **lines 108-118**:

```python
cursor.execute(
    """
    INSERT INTO users (user_id, username, created_at, last_activity)
    VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        username = EXCLUDED.username,
        last_activity = CURRENT_TIMESTAMP;
    """,
    (user_id, username)
)
```

## What's Needed to Connect to RDS

### 1. Environment Variables (Already Set in CloudFormation)

The Lambda gets these from environment variables (lines 84-88):

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `DB_Host` | RDS endpoint | `codingproblemsdb.cpsi440i610d.us-east-2.rds.amazonaws.com` |
| `DB_User` | Database username | `postgres` |
| `DB_Pass` | Database password | `aUKuZvdmbPMopd6hxxKw` |
| `DB_Name` | Database name | `codingproblemsdb` |
| `DB_Port` | Database port | `5432` |

**These are already configured in CloudFormation** - check the Lambda function's environment variables in AWS Console.

### 2. Database Table Must Exist

You need to create the `users` table in your RDS database:

```sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,  -- Cognito 'sub' claim
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Run this SQL in your RDS database** if you haven't already.

### 3. VPC Configuration (Already Set in CloudFormation)

- ✅ Lambda is in VPC (configured in CloudFormation)
- ✅ Subnet: Private subnet where RDS is accessible
- ✅ Security Group: Allows outbound to RDS port 5432

### 4. Security Group Rules

The Lambda's security group must allow:
- **Outbound:** TCP port 5432 to RDS security group

The RDS security group must allow:
- **Inbound:** TCP port 5432 from Lambda's security group

### 5. RDS Layer (Already Set in CloudFormation)

- ✅ `RDSLayerArn` layer is attached (contains psycopg2 library)

## Connection Code (Lines 95-102)

```python
connection = psycopg2.connect(
    host=DB_HOST,        # From environment variable
    user=DB_USER,        # From environment variable
    password=DB_PASS,    # From environment variable
    database=DB_NAME,    # From environment variable
    port=DB_PORT,        # From environment variable (defaults to 5432)
    connect_timeout=5    # 5 second timeout
)
```

## Checklist

- [x] Environment variables set in CloudFormation
- [x] VPC configuration set in CloudFormation
- [x] RDS Layer attached in CloudFormation
- [ ] **Create `users` table in RDS** (you need to do this!)
- [ ] Verify security group rules allow connection
- [ ] Test by registering a new user

## Testing the Connection

1. Register a new user in Cognito
2. Confirm their email
3. Check CloudWatch logs for `cognito-post-confirmation` Lambda
4. Query RDS to verify user was created:
   ```sql
   SELECT * FROM users;
   ```

## Troubleshooting

### "Connection timeout"
- Check VPC configuration
- Check security group rules
- Verify RDS is accessible from Lambda subnet

### "Table 'users' does not exist"
- Create the `users` table (see SQL above)

### "Access denied" or "Authentication failed"
- Check environment variables are correct
- Verify DB credentials in CloudFormation parameters

### "Module not found: psycopg2"
- Verify RDS Layer is attached to Lambda

