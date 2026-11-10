#!/usr/bin/env bash
# Local stand-in for AzureStaticWebApp@0, wired up in .azp-local.yml.
# The real task needs a deployment token and a network path to Azure; this only
# checks that there is something deployable where the task would look for it.
# Task inputs arrive as INPUT_<NAME>, exactly as they would for the real task.
set -euo pipefail

app_location="${INPUT_APP_LOCATION:?app_location input is required}"

if [ ! -f "$app_location/index.html" ]; then
  echo "##vso[task.logissue type=error]No index.html in $app_location"
  exit 1
fi

if [ -z "${INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN:-}" ]; then
  echo "##vso[task.logissue type=warning]No deployment token supplied; the real task would fail here."
fi

echo "Would upload these files to Azure Static Web Apps:"
(cd "$app_location" && find . -type f | sort | sed 's|^\./|  |')
echo "Nothing was deployed: this is a local stub."
