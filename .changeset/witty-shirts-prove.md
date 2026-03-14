---
"@no-mess/client": patch
---

Fix nested path updates so deep writes replace primitive values with the
required object or array containers. Also initialize fragment-backed fields
with empty object defaults when creating new values.
