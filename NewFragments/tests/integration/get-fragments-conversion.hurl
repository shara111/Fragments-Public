# tests/integration/get-fragments-conversion.hurl
# Test GET /v1/fragments/:id.ext conversion functionality

# Test markdown to HTML conversion
POST http://localhost:8080/v1/fragments
Content-Type: text/markdown
[BasicAuth]
user1@email.com:password1
`# Hello World\n\nThis is **markdown** text.`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/markdown"
[Captures]
markdownFragmentId: jsonpath "$.fragment.id"

# Convert markdown to HTML
GET http://localhost:8080/v1/fragments/{{markdownFragmentId}}.html
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/html
[Asserts]
header "Content-Type" == "text/html"
body contains "<h1>Hello World</h1>"
body contains "<strong>markdown</strong>"

# Test JSON to CSV conversion
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`[{"name":"John","age":30},{"name":"Jane","age":25}]`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/json"
[Captures]
jsonFragmentId: jsonpath "$.fragment.id"

# Convert JSON to CSV
GET http://localhost:8080/v1/fragments/{{jsonFragmentId}}.csv
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/csv
[Asserts]
header "Content-Type" == "text/csv"
body contains "name,age"
body contains "John,30"
body contains "Jane,25"

# Test CSV to JSON conversion
POST http://localhost:8080/v1/fragments
Content-Type: text/csv
[BasicAuth]
user1@email.com:password1
`name,age\nJohn,30\nJane,25`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/csv"
[Captures]
csvFragmentId: jsonpath "$.fragment.id"

# Convert CSV to JSON
GET http://localhost:8080/v1/fragments/{{csvFragmentId}}.json
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
header "Content-Type" == "application/json"
body contains "John"
body contains "30"

# Test JSON to YAML conversion
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
`{"name":"John","age":30,"city":"New York"}`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
[Captures]
jsonToYamlFragmentId: jsonpath "$.fragment.id"

# Convert JSON to YAML
GET http://localhost:8080/v1/fragments/{{jsonToYamlFragmentId}}.yaml
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/yaml
[Asserts]
header "Content-Type" == "application/yaml"
body contains "name:"
body contains "John"

# Test YAML to JSON conversion
POST http://localhost:8080/v1/fragments
Content-Type: application/yaml
[BasicAuth]
user1@email.com:password1
`name: John\nage: 30\ncity: New York`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "application/yaml"
[Captures]
yamlFragmentId: jsonpath "$.fragment.id"

# Convert YAML to JSON
GET http://localhost:8080/v1/fragments/{{yamlFragmentId}}.json
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
header "Content-Type" == "application/json"
body contains "John"
body contains "30"

# Test image conversion (PNG to JPEG)
# Create a small PNG image (1x1 pixel) - base64 encoded
POST http://localhost:8080/v1/fragments
Content-Type: image/png
[BasicAuth]
user1@email.com:password1
`base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/png"
[Captures]
pngFragmentId: jsonpath "$.fragment.id"

# Convert PNG to JPEG
GET http://localhost:8080/v1/fragments/{{pngFragmentId}}.jpg
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: image/jpeg
[Asserts]
header "Content-Type" == "image/jpeg"

# Test image conversion (JPEG to WebP)
# First create a JPEG fragment - using a small JPEG (base64 encoded)
POST http://localhost:8080/v1/fragments
Content-Type: image/jpeg
[BasicAuth]
user1@email.com:password1
`base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A/Syiiiv5XP4rP//Z`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "image/jpeg"
[Captures]
jpegFragmentId: jsonpath "$.fragment.id"

# Convert JPEG to WebP
GET http://localhost:8080/v1/fragments/{{jpegFragmentId}}.webp
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: image/webp
[Asserts]
header "Content-Type" == "image/webp"

# Test unsupported conversion (text to image)
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Some text`

HTTP/1.1 201
[Asserts]
jsonpath "$.status" == "ok"
[Captures]
textFragmentId: jsonpath "$.fragment.id"

# Try to convert text to image (should fail)
GET http://localhost:8080/v1/fragments/{{textFragmentId}}.png
[BasicAuth]
user1@email.com:password1

HTTP/1.1 415
[Asserts]
jsonpath "$.error.message" contains "Cannot convert"

# Test unsupported conversion (image to text)
GET http://localhost:8080/v1/fragments/{{pngFragmentId}}.txt
[BasicAuth]
user1@email.com:password1

HTTP/1.1 415
[Asserts]
jsonpath "$.error.message" contains "Cannot convert"

# Test unknown extension
GET http://localhost:8080/v1/fragments/{{textFragmentId}}.xyz
[BasicAuth]
user1@email.com:password1

HTTP/1.1 415
[Asserts]
jsonpath "$.error.message" contains "Unknown or unsupported type"

# Test same type (no conversion needed)
GET http://localhost:8080/v1/fragments/{{textFragmentId}}.txt
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: text/plain
[Asserts]
body == "Some text"

