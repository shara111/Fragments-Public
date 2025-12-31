# tests/integration/lab-10-dynamodb.hurl
# Integration test for DynamoDB backend functionality
# Tests POST, GET info, GET list, DELETE operations with DynamoDB storage

# Step 1: POST a new JSON fragment
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{ "service": "DynamoDB" }`

# Step 1: Confirm that the server returns a 201, and capture the Location header value and the fragment's id
HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
[Captures]
fragment1_url: header "Location"
fragment1_id: jsonpath "$.fragment.id"

# Step 2: GET the fragment info (i.e., metadata) for the fragment you just created
GET {{fragment1_url}}/info
[BasicAuth]
user1@email.com:password1

# Step 2: Confirm that the server returns a 200 and that all of the metadata properties match what you expect
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment1_id}}
jsonpath "$.fragment.type" == "application/json"
jsonpath "$.fragment.size" == 25
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# Step 3: POST a second Markdown fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
`DynamoDB is **great**.`

# Step 3: Confirm that the server returns a 201, and once again capture the Location header value and the second id
HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
[Captures]
fragment2_url: header "Location"
fragment2_id: jsonpath "$.fragment.id"

# Step 4: GET the fragment info (i.e., metadata) you just created
GET {{fragment2_url}}/info
[BasicAuth]
user1@email.com:password1

# Step 4: Confirm that the server returns a 200 and that all of the metadata properties match what you expect
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == {{fragment2_id}}
jsonpath "$.fragment.type" == "text/markdown"
jsonpath "$.fragment.size" == 22
jsonpath "$.fragment.ownerId" matches "^[0-9a-fA-F]+$"
jsonpath "$.fragment.created" isString
jsonpath "$.fragment.updated" isString

# Step 5: GET all of the fragments for the same authorized user without expanding them (i.e., just get back the IDs)
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

# Step 5: Confirm that the list of fragments includes the two id values you captured above
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
body matches "{{fragment1_id}}"
body matches "{{fragment2_id}}"
jsonpath "$.fragments[0]" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragments[1]" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"

# Step 6: DELETE the first fragment you created above
DELETE {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

# Step 6: Confirm that the server returns a 200
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"

# Step 7: Try to GET the first fragment again using the url you captured above
GET {{fragment1_url}}
[BasicAuth]
user1@email.com:password1

# Step 7: Confirm that the server returns a 404, since the fragment should be deleted
HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
jsonpath "$.error.message" == "Fragment not found"

# Step 8: GET all of the fragments for the same authorized user without expanding them (i.e., just get back the IDs) a second time
GET http://localhost:8080/v1/fragments
[BasicAuth]
user1@email.com:password1

# Step 8: Confirm that the first id is NOT included but that the second id is (i.e., that the second was not deleted)
HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
body not matches "{{fragment1_id}}"
body matches "{{fragment2_id}}"

