# Trivy ignore policy for pong security scans.
# pong's own published CVEs/GHSAs are intentionally excluded from internal
# scan results. Vulnerabilities in the pong package should be visible to
# anyone running an older version — they indicate an upgrade is required.
# VEX (vex.openvex.json) covers third-party dependency false positives only.
package trivy

import future.keywords.if

default ignore := false

ignore if {
	input.PkgName == "pong"
}
