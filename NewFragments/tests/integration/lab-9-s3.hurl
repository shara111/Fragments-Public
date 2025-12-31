# tests/integration/lab-9-s3.hurl
# Integration test for S3 backend functionality
# Tests POST, GET, DELETE operations with S3 storage

# Step 1: POST a new text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Hello S3!`

# Step 1: Confirm that the server returns a 201, and capture the Location header value
HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 9
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"
[Captures]
url: header "Location"

# Step 2: GET the fragment you just created using the url as an authorized user
GET {{url}}
[BasicAuth]
user1@email.com:password1

# Step 2: Confirm that the server returns a 200, that the type of the fragment is text/plain, and that the body is equal to Hello S3!
HTTP/1.1 200
Content-Type: text/plain
Content-Length: 9
[Asserts]
body == "Hello S3!"

# Step 3: DELETE the fragment using the url as an authorized user
DELETE {{url}}
[BasicAuth]
user1@email.com:password1

# Step 3: Confirm that the server returns a 200
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# Step 4: Try to GET the fragment again using the url as an authorized user
GET {{url}}
[BasicAuth]
user1@email.com:password1

# Step 4: Confirm that the server returns a 404, since the fragment should be deleted
HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "Fragment not found"

