#!/usr/bin/env bash
#
# OrderStack Load Test Runner
# Executes the JMeter test plan and generates an HTML report.
#
# Usage:
#   ./load-tests/run-load-test.sh                     # full 15-min test
#   ./load-tests/run-load-test.sh --short              # 1-min quick sanity check
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JMX_FILE="${SCRIPT_DIR}/orderstack-load-test.jmx"
RESULTS_DIR="${SCRIPT_DIR}/results"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
CSV_FILE="${RESULTS_DIR}/results-${TIMESTAMP}.csv"
REPORT_DIR="${RESULTS_DIR}/report-${TIMESTAMP}"

# Verify JMeter is installed
if ! command -v jmeter &> /dev/null; then
  echo "ERROR: jmeter not found. Install with: brew install jmeter"
  exit 1
fi

# Clean previous results if report dir would collide
mkdir -p "${RESULTS_DIR}"

echo "================================================"
echo "  OrderStack Load Test"
echo "  Plan:    ${JMX_FILE}"
echo "  Results: ${CSV_FILE}"
echo "  Report:  ${REPORT_DIR}"
echo "  Started: $(date)"
echo "================================================"
echo ""

# Run JMeter in non-GUI mode
jmeter \
  -n \
  -t "${JMX_FILE}" \
  -l "${CSV_FILE}" \
  -e \
  -o "${REPORT_DIR}" \
  -Jjmeter.save.saveservice.output_format=csv

EXIT_CODE=$?

echo ""
echo "================================================"
echo "  Load Test Complete"
echo "  Exit code: ${EXIT_CODE}"
echo "  CSV:       ${CSV_FILE}"
echo "  HTML Report: ${REPORT_DIR}/index.html"
echo "  Finished: $(date)"
echo "================================================"

# Open the HTML report on macOS
if [[ "$OSTYPE" == "darwin"* ]] && [[ -f "${REPORT_DIR}/index.html" ]]; then
  echo ""
  echo "Opening HTML report in browser..."
  open "${REPORT_DIR}/index.html"
fi

exit ${EXIT_CODE}
