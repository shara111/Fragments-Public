# tests/integration/put-fragments.hurl
# Test PUT /v1/fragments/:id

# First, create a fragment to update
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Original fragment data`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 22
[Captures]
fragmentId: jsonpath "$.fragment.id"
originalSize: jsonpath "$.fragment.size"

# Update the fragment with new data
PUT http://localhost:8080/v1/fragments/{{fragmentId}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Updated fragment data - this is longer`

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragmentId}}"
jsonpath "$.fragment.type" == "text/plain"
jsonpath "$.fragment.size" == 38
jsonpath "$.fragment.size" != "{{originalSize}}"

# Verify the updated data can be retrieved
GET http://localhost:8080/v1/fragments/{{fragmentId}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body == "Updated fragment data - this is longer"

# Test updating with Content-Type including charset
PUT http://localhost:8080/v1/fragments/{{fragmentId}}
Content-Type: text/plain; charset=utf-8
[BasicAuth]
user1@email.com:password1
`Updated with charset`

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain; charset=utf-8"

# Test unauthenticated PUT
PUT http://localhost:8080/v1/fragments/{{fragmentId}}
Content-Type: text/plain
`Unauthenticated update attempt`

HTTP/1.1 401

# Test PUT with wrong Content-Type (mismatch)
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{"key": "value"}`

HTTP/1.1 201
[Captures]
jsonFragmentId: jsonpath "$.fragment.id"

# Try to update JSON fragment with text/plain
PUT http://localhost:8080/v1/fragments/{{jsonFragmentId}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Plain text data`

HTTP/1.1 400
[Asserts]
jsonpath "$.error.message" == "Content-Type does not match existing fragment type"

# Test PUT non-existent fragment
PUT http://localhost:8080/v1/fragments/00000000-0000-0000-0000-000000000000
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Some data`

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"

# Test PUT with missing Content-Type
PUT http://localhost:8080/v1/fragments/{{fragmentId}}
[BasicAuth]
user1@email.com:password1
`Data without Content-Type`

HTTP/1.1 400
[Asserts]
jsonpath "$.error.message" == "Content-Type header is required"

# Test PUT with empty body
PUT http://localhost:8080/v1/fragments/{{fragmentId}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1

HTTP/1.1 400
[Asserts]
jsonpath "$.error.message" == "Body required"

