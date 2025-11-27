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