# Converts static/_headers (Cloudflare's format: a path line, then indented
# "Name: value" lines) into static-web-server's [[advanced.headers]] entries.
# Its globs let `*` cross `/` like Cloudflare's splat, so paths carry over as-is.

/^[[:space:]]*(#|$)/ { next }

/^[^[:space:]]/ {
	printf "\n[[advanced.headers]]\nsource = \"%s\"\n[advanced.headers.headers]\n", $1
	next
}

{
	sub(/^[[:space:]]+/, "")
	colon = index($0, ":")
	name = substr($0, 1, colon - 1)
	value = substr($0, colon + 1)
	sub(/^[[:space:]]+/, "", value)
	printf "%s = \"%s\"\n", name, value
}
