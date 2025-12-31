#Confirms that posting an unsupported Content-Type produces a 415 error
POST http://localhost:8080/v1/fragments
Content-Type: application/octet-stream
[BasicAuth]
user1@email.com:password1
`fake binary data`

#1. We expect to get back an HTTP 415 error
HTTP/1.1 415
#We have various assertions about the response that we want to check
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" == "Unsupported content type"
jsonpath "$.error.code" == 415