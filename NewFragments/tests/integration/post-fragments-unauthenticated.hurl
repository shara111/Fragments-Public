#Confirm that posting a fragment when not authenticated produces a 401 error
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
#Body of the request goes in 
`This is the fragment data!`

#We expect to get back an HTTP 401 error 
HTTP/1.1 401
#We have various assertions about the response that we want to check
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 401
jsonpath "$.error.message" == "Authentication required"