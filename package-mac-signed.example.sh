export APPLE_ID="" # Replace with your Apple ID email
export APPLE_APP_SPECIFIC_PASSWORD=""
export APPLE_TEAM_ID="" # Replace with your Team ID, it looks like "AB8Y7TRS2P"

# Application Cert
export CSC_LINK="./certificate-application.p12"
export CSC_KEY_PASSWORD=""

# Installer Cert
export CSC_INSTALLER_LINK="./certificate-installer.p12"
export CSC_INSTALLER_KEY_PASSWORD=""

npm run package


# Notarization and Stapling Script
# path to built DMG
DMG="dist/cmdforge-1.0.0.dmg"

# quick check: exit if file missing
if [ ! -f "$DMG" ]; then
  echo "DMG not found: $DMG"
  exit 1
fi

echo "Submitting $DMG to Apple notary service (using APPLE_ID or API key)..."

# Preferred: API key method (uncomment and set APPLE_API_KEY/APPLE_API_KEY_ID/APPLE_API_ISSUER)
# if [ -n "$APPLE_API_KEY" ] && [ -n "$APPLE_API_KEY_ID" ] && [ -n "$APPLE_API_ISSUER" ]; then
#   xcrun notarytool submit "$DMG" \
#     --key "$APPLE_API_KEY" --key-id "$APPLE_API_KEY_ID" --issuer "$APPLE_API_ISSUER" \
#     --wait || { echo "notary submit failed"; exit 1; }
# else

# Fallback: Apple ID + app-specific password (uses APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD)
xcrun notarytool submit "$DMG" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait || { echo "notary submit failed"; exit 1; }
# fi

echo "Notarization succeeded — stapling ticket to $DMG..."
xcrun stapler staple "$DMG" || { echo "stapler failed"; exit 1; }

echo "Validating staple..."
xcrun stapler validate "$DMG" || { echo "stapler validate failed"; exit 1; }

echo "DMG notarized and stapled: $DMG"