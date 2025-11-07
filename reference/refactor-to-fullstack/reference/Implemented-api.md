# Authentication
## Register

curl http://localhost:8080/api/v1/auth/register \
  --request POST \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'email=' \
  --data-urlencode 'name=' \
  --data-urlencode 'password=' \
  --data-urlencode 'username='
Code: 201
JSON:
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "8102abc8-0fe0-484b-bf93-f81ec03bee7d",
    "name": "Test User4",
    "email": "test4@example.com",
    "username": "testuser4",
    "created_at": "2025-10-17T20:41:52.0498127Z",
    "created_by": null,
    "updated_at": "2025-10-17T20:41:52.0498127Z",
    "updated_by": null
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1760733712
  }
}

## Login
curl http://localhost:8080/api/v1/auth/login \
  --request POST \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'email_or_username=' \
  --data-urlencode 'password='
Code: 200
JSON:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMjg3OGQyNDYtZWY3Ny00YTI5LWIzOTgtZGM1MmJiMzIyNGEwIiwiZW1haWwiOiJlY2hvdGVjaG5vMDA3QGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiYWRtaW4iLCJleHAiOjE3NjA4MjA4NDYsImlhdCI6MTc2MDczNDQ0Nn0.NhQvaZR9b9lSRGorBDr4SJoShHcr5jey1dF6eHqPrro",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMjg3OGQyNDYtZWY3Ny00YTI5LWIzOTgtZGM1MmJiMzIyNGEwIiwiZW1haWwiOiJlY2hvdGVjaG5vMDA3QGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiYWRtaW4iLCJleHAiOjE3NjEzMzkyNDYsImlhdCI6MTc2MDczNDQ0Nn0.VfxQ4FQv80XgcHySp1CVs9l-jkyb6-QL-UHP-b_Kc84",
    "user": {
      "id": "2878d246-ef77-4a29-b398-dc52bb3224a0",
      "name": "Jane Doe",
      "email": "janedoe@gmail.com",
      "username": "admin",
      "created_at": "2025-10-17T00:00:00Z",
      "created_by": null,
      "updated_at": "2025-10-17T00:00:00Z",
      "updated_by": null
    }
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1760734446
  }
}

## Refresh Token
curl http://localhost:8080/api/v1/auth/refresh \
  --request POST \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'refresh_token='
Code: 200
{
  "status": "OK",
  "message": "Token refreshed",
  "data": {
    "access_token": "string",
    "expired_at": "2025-11-07T07:52:30.553Z",
    "refresh_token": "string",
    "refreshable_until": "2025-11-07T07:52:30.553Z"
  },
  "meta": null,
  "errors": null
}

## Logout
curl http://localhost:8080/api/v1/auth/logout \
  --request POST \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
Code: 200
{
  "status": "OK",
  "message": "success",
  "data": null
}

# Account
## Create Account
curl http://localhost:8080/api/v1/accounts \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "personal_id": 1,
  "name": "",
  "icon": "",
  "color": "",
  "active": true,
  "account_type": "",
  "initial_amount": 1,
  "usability": "USABLE",
  "group_id": null
}'
CODE: 200
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "personal_id": 1,
    "name": "string",
    "icon": "string",
    "color": "string",
    "active": true,
    "usability": "string",
    "position": {
      "propertyName*": "anything"
    },
    "group_id": null,
    "created_at": "2025-11-07T07:52:30.553Z",
    "created_by": null,
    "updated_at": null,
    "updated_by": null
  },
  "meta": null
}


## List Account
curl http://localhost:8080/api/v1/accounts?keyword= \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
CODE:200
{
  "success": true,
  "message": "Accounts retrieved successfully",
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "personal_id": 1,
      "name": "string",
      "icon": "string",
      "color": "string",
      "active": true,
      "usability": "string",
      "initial_amount": 0,
      "account_type":"string",
      "position": null,
      "group_id": null,
      "created_at": "2025-11-07T07:52:30.553Z",
      "created_by": null,
      "updated_at": null,
      "updated_by": null
    }
  ],
  "meta": null
}

## Batch update account order
curl http://localhost:8080/api/v1/accounts/swap-order \
  --request PUT \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "order_map": [
    {
      "id": "",
      "personal_id": 1
    }
  ]
}'
CODE: 200
{
  "success": true,
  "message": "Account swaped successfully",
  "data": null,
  "meta": null
}
Notes: Update map of id and personal_id based payload sent

## Account Detail
curl http://localhost:8080/api/v1/accounts/123e4567-e89b-12d3-a456-426614174000 \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
CODE: 200
{
  "success": true,
  "message": "Account retrieved successfully",
  "data":  {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "personal_id": 1,
      "name": "string",
      "icon": "string",
      "color": "string",
      "active": true,
      "usability": "string",
      "initial_amount": 0,
      "account_type":"string",
      "position": null,
      "group_id": null,
      "created_at": "2025-11-07T07:52:30.553Z",
      "created_by": null,
      "updated_at": null,
      "updated_by": null
    },
  "meta": null
}

## Update Account
curl http://localhost:8080/api/v1/accounts/123e4567-e89b-12d3-a456-426614174000 \
  --request PUT \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "name": "",
  "icon": "",
  "color": "",
  "active": true,
  "account_type": "",
  "initial_amount": 1,
  "usability": "USABLE",
  "group_id": null
}'
Code:200
{
  "success": true,
  "message": "Account updated successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "personal_id": 1,
    "name": "string",
    "icon": "string",
    "color": "string",
    "active": true,
    "usability": "string",
    "position": null,
    "group_id": null,
    "created_at": "2025-11-07T07:52:30.553Z",
    "created_by": null,
    "updated_at": null,
    "updated_by": null
  },
  "meta": null
}

## Delete Account
curl http://localhost:8080/api/v1/accounts/123e4567-e89b-12d3-a456-426614174000 \
  --request DELETE \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
Code: 200
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "meta": null
}