# tests/integration/delete-fragments.hurl
# Test DELETE /v1/fragments/:id

# First, create a fragment to delete
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`This is a fragment to delete!`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
[Captures]
fragmentId: jsonpath "$.fragment.id"

# Delete the fragment
DELETE http://localhost:8080/v1/fragments/{{fragmentId}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.message" == "Fragment deleted successfully"

# Verify the fragment is deleted - GET should return 404
GET http://localhost:8080/v1/fragments/{{fragmentId}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"

# Verify the fragment info is deleted - GET /info should return 404
GET http://localhost:8080/v1/fragments/{{fragmentId}}/info
[BasicAuth]
user1@email.com:password1

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"

# Test unauthenticated DELETE
DELETE http://localhost:8080/v1/fragments/00000000-0000-0000-0000-000000000000

HTTP/1.1 401

# Test DELETE non-existent fragment
DELETE http://localhost:8080/v1/fragments/00000000-0000-0000-0000-000000000000
[BasicAuth]
user1@email.com:password1

HTTP/1.1 404
[Asserts]
jsonpath "$.error.message" == "Fragment not found"

