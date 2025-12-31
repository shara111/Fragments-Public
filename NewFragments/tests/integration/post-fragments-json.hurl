#Confirm that posting a JSON fragment works, and doing a GET for the same fragment 
#returns the expected result
POST http://localhost:8080/v1/fragments
Content-Type: application/JSON
#Include HTTP Basic Auth credentials
[BasicAuth]
user1@email.com:password1
#Body of the request goes in ```...``` when it's a string
`{"name": "Shara", "age": "21"}`

#1. We expect to get back an HTTP 201
HTTP/1.1 201
# We have various assertions about the response that we want to check
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/JSON"
#Capture the Location URL into a variable named 'url'
[Captures]
url: header "Location"

#2. Try to GET the fragment we just posted by its URL
GET {{url}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/JSON
Content-Length: 30
[Asserts]
body == `{"name": "Shara", "age": "21"}`

